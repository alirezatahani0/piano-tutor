interface CoverProps {
  song?: { title: string; artist?: string }
  accent?: string
  mark?: string
  large?: boolean
}

export default function Cover({ accent = '#d9d6ea', mark = '#5d518c', large = false }: CoverProps) {
  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-[14px] ${
        large ? 'h-28 w-28 sm:h-36 sm:w-36' : 'h-[58px] w-[58px]'
      }`}
      style={{ backgroundColor: accent }}
      aria-hidden="true"
    >
      {/* Horizontal staff lines */}
      {[0.27, 0.42, 0.57, 0.72].map((top, i) => (
        <div
          key={i}
          className="absolute left-[18%] right-[18%] h-px opacity-40"
          style={{ backgroundColor: mark, top: `${top * 100}%` }}
        />
      ))}

      {/* Vertical note stems */}
      <div
        className="absolute top-[23%] h-[42%] w-[2px] rounded-full"
        style={{ backgroundColor: mark, left: '35%' }}
      />
      <div
        className="absolute top-[38%] h-[35%] w-[2px] rounded-full"
        style={{ backgroundColor: mark, left: '53%' }}
      />

      {/* Note heads */}
      <div
        className="absolute top-[58%] h-[13%] w-[18%] rounded-[50%] -rotate-12"
        style={{ backgroundColor: mark, left: '25%' }}
      />
      <div
        className="absolute top-[67%] h-[13%] w-[18%] rounded-[50%] -rotate-12"
        style={{ backgroundColor: mark, left: '43%' }}
      />
    </div>
  )
}
