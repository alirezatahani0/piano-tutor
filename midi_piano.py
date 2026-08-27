import argparse

from player import ARCHIVE_DIR, SERIAL_PORT, list_archive_files, play_blocking


def main() -> None:
    parser = argparse.ArgumentParser(description="Play a MIDI file to the piano LED strip.")
    parser.add_argument(
        "midi",
        nargs="?",
        help="MIDI filename from the archive folder, or a path to a .mid file.",
    )
    parser.add_argument(
        "--port",
        default=SERIAL_PORT,
        help=f"Arduino serial port (default: {SERIAL_PORT})",
    )
    args = parser.parse_args()

    midi = args.midi
    if midi is None:
        files = list_archive_files()
        if not files:
            print(f"No MIDI files found in {ARCHIVE_DIR}")
            print("Add .mid files to the archive folder, or pass a path.")
            return
        midi = str(files[0])
        print(f"No file specified; playing {files[0].name}\n")

    play_blocking(midi, port=args.port)


if __name__ == "__main__":
    main()
