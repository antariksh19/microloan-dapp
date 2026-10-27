// The loan's journey as a rail: Requested, Funded, Withdrawn, Repaid.
// Defaulted and Cancelled end the rail in their own colour.
const STAGES = ["Requested", "Funded", "Withdrawn", "Repaid"];

export default function LoanTrack({ status }) {
  let index = Math.min(status, 3);
  let labels = STAGES;
  let color = "lagoon";
  if (status === 4) {
    labels = [...STAGES.slice(0, 3), "Defaulted"];
    color = "coral";
  }
  if (status === 5) {
    index = 0;
    labels = ["Cancelled", ...STAGES.slice(1)];
    color = "mute";
  }
  const finished = status >= 3;
  const fill = { lagoon: "bg-lagoon", coral: "bg-coral", mute: "bg-mute" }[color];
  const ring = { lagoon: "border-lagoon", coral: "border-coral", mute: "border-mute" }[color];

  return (
    <div role="img" aria-label={`Loan stage: ${labels[index]}`} className="relative w-full min-w-[15rem]">
      <div aria-hidden className="absolute left-[12.5%] right-[12.5%] top-[7px] h-0.5 rounded bg-line" />
      <div
        aria-hidden
        className={`rail-draw absolute left-[12.5%] top-[7px] h-0.5 rounded ${fill}`}
        style={{ width: `${(index / 3) * 75}%` }}
      />
      <ol className="relative grid grid-cols-4">
        {labels.map((label, i) => {
          const reached = i <= index;
          const current = i === index;
          let node = "border-line bg-paper";
          if (reached && (!current || finished)) node = `${ring} ${fill}`;
          else if (current) node = `${ring} bg-paper border-[5px]`;
          return (
            <li key={label} className="flex flex-col items-center gap-1.5">
              <span aria-hidden className={`h-4 w-4 rounded-full border-2 ${node}`} />
              <span className={`text-xs leading-none ${current ? "font-semibold text-ink" : "text-mute"}`}>{label}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
