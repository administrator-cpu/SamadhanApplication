// app/(customer)/raise-ticket.js
import RaiseTicketForm from '../../src/components/RaiseTicketForm';

export default function CustomerRaiseTicket() {
  return <RaiseTicketForm role="USER" listPath="/(customer)/tickets" />;
}