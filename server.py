import asyncio
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from player import (
    ARCHIVE_DIR,
    PianoPlayer,
    inspect_midi,
    list_archive_files,
    list_serial_ports,
    resolve_archive_file,
)


STATIC_DIR = Path(__file__).resolve().parent / "static"


class Hub:
    def __init__(self) -> None:
        self.loop: asyncio.AbstractEventLoop | None = None
        self.clients: set[asyncio.Queue] = set()

    def broadcast(self, message: dict) -> None:
        loop = self.loop
        if loop is None:
            return

        def _put() -> None:
            for queue in list(self.clients):
                if message.get("type") == "status" and queue.qsize() > 80:
                    continue
                queue.put_nowait(message)

        loop.call_soon_threadsafe(_put)


hub = Hub()
player = PianoPlayer(on_message=hub.broadcast)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    ARCHIVE_DIR.mkdir(exist_ok=True)
    STATIC_DIR.mkdir(exist_ok=True)
    hub.loop = asyncio.get_running_loop()
    yield
    player.stop()
    player.disconnect()


app = FastAPI(title="Piano LED", lifespan=lifespan)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


class PlayRequest(BaseModel):
    name: str


class ConnectRequest(BaseModel):
    port: str | None = None


class ConfigRequest(BaseModel):
    preset: str | None = None
    led_offset: int | None = None
    num_leds: int | None = None
    fold_to_strip: bool | None = None


class TempoRequest(BaseModel):
    rate: float | None = None
    bpm: float | None = None


class ColorRequest(BaseModel):
    hex: str | None = None
    r: int | None = None
    g: int | None = None
    b: int | None = None
    rgb: list[int] | None = None


@app.get("/")
async def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/api/files")
async def files() -> dict:
    items = []
    for path in list_archive_files():
        try:
            items.append(inspect_midi(path))
        except Exception as exc:
            items.append(
                {
                    "name": path.name,
                    "title": path.stem,
                    "duration": 0,
                    "events": 0,
                    "tracks": 0,
                    "bpm": 120,
                    "key": None,
                    "time_signature": "4/4",
                    "beats_per_bar": 4,
                    "error": str(exc),
                }
            )
    return {"files": items}


@app.post("/api/files")
async def upload(file: UploadFile = File(...)) -> dict:
    filename = Path(file.filename or "").name
    if Path(filename).suffix.lower() not in {".mid", ".midi"}:
        raise HTTPException(status_code=400, detail="Please upload a .mid or .midi file.")

    ARCHIVE_DIR.mkdir(exist_ok=True)
    destination = ARCHIVE_DIR / filename
    destination.write_bytes(await file.read())

    try:
        return inspect_midi(destination)
    except Exception as exc:
        destination.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail=f"Could not read MIDI file: {exc}") from exc


@app.get("/api/ports")
async def ports() -> dict:
    return {"ports": list_serial_ports()}


@app.get("/api/config")
async def get_config() -> dict:
    return player.config()


@app.post("/api/config")
async def set_config(body: ConfigRequest) -> dict:
    try:
        return player.set_config(
            preset=body.preset,
            led_offset=body.led_offset,
            num_leds=body.num_leds,
            fold_to_strip=body.fold_to_strip,
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/api/status")
async def status() -> dict:
    return player.status()


@app.post("/api/connect")
async def connect(body: ConnectRequest) -> dict:
    try:
        await asyncio.to_thread(player.connect, body.port)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return player.status()


@app.post("/api/disconnect")
async def disconnect() -> dict:
    player.disconnect()
    return player.status()


@app.post("/api/play")
async def play(body: PlayRequest) -> dict:
    try:
        resolve_archive_file(body.name)
        return player.play(body.name)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/test/walk")
async def test_walk() -> dict:
    try:
        return player.test_walk()
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/test/chord")
async def test_chord() -> dict:
    try:
        return player.test_chord()
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/pause")
async def pause() -> dict:
    player.pause()
    return player.status()


@app.post("/api/resume")
async def resume() -> dict:
    player.resume()
    return player.status()


@app.post("/api/stop")
async def stop() -> dict:
    player.stop()
    return player.status()


@app.post("/api/tempo")
async def set_tempo(body: TempoRequest) -> dict:
    try:
        if body.rate is not None:
            return player.set_tempo_rate(body.rate)
        if body.bpm is not None:
            base = float(player.status().get("bpm") or 120.0)
            if base <= 0:
                base = 120.0
            return player.set_tempo_rate(float(body.bpm) / base)
        raise HTTPException(status_code=400, detail="Provide rate or bpm.")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/color")
async def set_color(body: ColorRequest) -> dict:
    try:
        return player.set_led_color(
            hex=body.hex,
            r=body.r,
            g=body.g,
            b=body.b,
            rgb=body.rgb,
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.websocket("/ws")
async def websocket(socket: WebSocket) -> None:
    await socket.accept()
    queue: asyncio.Queue = asyncio.Queue()
    hub.clients.add(queue)
    await socket.send_json({"type": "status", **player.status()})

    async def sender() -> None:
        while True:
            message = await queue.get()
            await socket.send_json(message)

    async def receiver() -> None:
        while True:
            data = await socket.receive_text()
            if data == "ping":
                await queue.put({"type": "pong"})

    try:
        await asyncio.gather(sender(), receiver())
    except (WebSocketDisconnect, Exception):
        pass
    finally:
        hub.clients.discard(queue)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("server:app", host="127.0.0.1", port=8000, reload=True)
