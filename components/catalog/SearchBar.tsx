import { TOWNS } from "@/lib/db/models/Property";
import { todayIST, addDays } from "@/lib/dates";

/** Plain GET form: works without JavaScript and on slow networks. */
export default function SearchBar({ town = "", date = "" }: { town?: string; date?: string }) {
  const min = addDays(todayIST(), 0);
  return (
    <form action="/stays" method="get" className="ticket grid gap-3 p-4 sm:grid-cols-[1.3fr_1fr_auto] sm:items-end sm:p-5">
      <div>
        <label htmlFor="s-town" className="label">Where</label>
        <select id="s-town" name="town" defaultValue={town} className="field">
          <option value="">Anywhere in Sikkim</option>
          {TOWNS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="s-date" className="label">Check-in</label>
        <input id="s-date" name="date" type="date" min={min} defaultValue={date} className="field" />
      </div>
      <button type="submit" className="btn btn-primary">Show free rooms</button>
    </form>
  );
}
