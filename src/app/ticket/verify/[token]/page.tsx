import { getTicketPublicStatus } from "@/lib/services/checkin";
import { formatEventDate } from "@/lib/format";

export default async function TicketVerifyPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const ticket = await getTicketPublicStatus(token) as
    | {
        ticket_number: string;
        status: string;
        customer_name: string;
        event_name: string;
        start_date: string;
        ticket_type_name: string;
      }
    | null;

  if (!ticket) {
    return (
      <div className="mx-auto max-w-md px-5 py-24 text-center">
        <p className="font-display text-2xl text-ember">Invalid ticket</p>
        <p className="mt-2 text-sm text-slate">No ticket matches this code.</p>
      </div>
    );
  }

  const isValid = ticket.status === "VALID";
  return (
    <div className="mx-auto max-w-md px-5 py-24 text-center">
      <p
        className={`font-display text-3xl ${
          isValid ? "text-emerald" : ticket.status === "USED" ? "text-slate" : "text-ember"
        }`}
      >
        {isValid ? "VALID TICKET" : ticket.status}
      </p>
      <div className="mt-6 space-y-1 text-sm text-bone">
        <p>{ticket.ticket_number}</p>
        <p>{ticket.customer_name}</p>
        <p>{ticket.event_name} · {ticket.ticket_type_name}</p>
        <p className="text-slate">{formatEventDate(ticket.start_date)}</p>
      </div>
      <p className="mt-6 text-xs text-slate">This page confirms ticket authenticity only. Entry is granted by staff at the door.</p>
    </div>
  );
}
