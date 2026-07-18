// app/(agent)/tickets/index.js
import TicketListScreen from '../../../src/components/TicketListScreen';

export default function AgentTicketList() {
  return <TicketListScreen basePath="/(agent)/tickets" />;
}