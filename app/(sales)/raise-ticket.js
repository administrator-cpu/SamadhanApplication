// app/(sales)/raise-ticket.js
import RaiseTicketForm from '../../src/components/RaiseTicketForm';

export default function SalesRaiseTicket() {
  return <RaiseTicketForm role="SALES" listPath="/(sales)/tickets" />;
}