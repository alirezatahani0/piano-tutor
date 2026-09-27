import { useState } from 'react'

export default function SettingsPage() {
  const [leftColor, setLeftColor] = useState('#7067E8')
  const [rightColor, setRightColor] = useState('#ED5B4D')

  const ledColors = ['#ED5B4D', '#FF9F43', '#FFD166', '#55C89F', '#48A9E6', '#7067E8', '#B865D6', '#F4F1EB']

  return (
    <section className="app-content min-w-0 space-y-5 lg:p-6 xl:p-8">
      <div className="rounded-[20px] border border-[#e5e7ec] bg-white p-5 shadow-[0_8px_28px_rgba(23,32,51,0.03)] sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#8c93a1]">
              Connected device
            </span>
            <h2 className="mt-2 text-xl font-bold tracking-[-0.03em]">Keylight One</h2>
            <p className="mt-1 text-xs text-[#8d94a2]">
              Your color changes are applied to the keyboard instantly.
            </p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[#edf8f3] px-3 py-1.5 text-[10px] font-bold text-[#42966f]">
            <i className="h-2 w-2 rounded-full bg-[#4fbd8b]" />
            Connected
          </span>
        </div>
      </div>

      <div className="rounded-[20px] border border-[#e5e7ec] bg-white p-5 shadow-[0_8px_28px_rgba(23,32,51,0.03)] sm:p-7">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">LED hand colors</h2>
            <p className="mt-1.5 text-xs leading-5 text-[#8d94a2]">
              Choose a distinct guide color for each hand.
            </p>
          </div>
          <span className="rounded-full bg-[#edf8f3] px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-[#459a73]">
            Live
          </span>
        </div>

        <div className="mt-7 grid gap-7 sm:grid-cols-2">
          {[
            { label: 'Left hand', value: leftColor, setter: setLeftColor },
            { label: 'Right hand', value: rightColor, setter: setRightColor },
          ].map((hand) => (
            <div key={hand.label} className="rounded-2xl border border-[#e8eaee] bg-[#fafbfc] p-4">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-semibold">{hand.label}</span>
                <span className="flex items-center gap-2 text-[10px] font-medium uppercase text-[#9197a4]">
                  <i
                    className="h-2.5 w-2.5 rounded-full"
                    style={{
                      backgroundColor: hand.value,
                      boxShadow: `0 0 6px ${hand.value}`,
                    }}
                  />
                  {hand.value}
                </span>
              </div>

              <div className="flex flex-wrap gap-3">
                {ledColors.map((color) => (
                  <button
                    key={color}
                    onClick={() => hand.setter(color)}
                    className={`flex h-8 w-8 items-center justify-center rounded-full transition hover:scale-110 ${
                      hand.value === color ? 'ring-2 ring-[#303649] ring-offset-2' : ''
                    }`}
                    style={{ backgroundColor: color }}
                    aria-label={`Set ${hand.label} to ${color}`}
                  >
                    {hand.value === color && (
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          color === '#F4F1EB' ? 'bg-[#555]' : 'bg-white'
                        }`}
                      />
                    )}
                  </button>
                ))}
              </div>

              <div className="mt-4 border-t border-[#e8eaee] pt-4">
                <label className="flex cursor-pointer items-center justify-between">
                  <span>
                    <span className="block text-xs font-semibold text-[#4d5566]">Custom color</span>
                    <span className="mt-0.5 block text-[10px] text-[#969ca8]">Choose any LED color</span>
                  </span>
                  <span className="relative flex h-9 w-12 items-center justify-center overflow-hidden rounded-lg border border-[#dfe2e7] bg-white shadow-sm">
                    <input
                      type="color"
                      value={hand.value}
                      onChange={(e) => hand.setter(e.target.value.toUpperCase())}
                      className="absolute h-14 w-16 cursor-pointer border-0 bg-transparent p-0"
                      aria-label={`Choose custom color for ${hand.label}`}
                    />
                  </span>
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
