// app/(admin)/tickets/index.js
import TicketListScreen from '../../../src/components/TicketListScreen';

export default function AdminTicketList() {
  return <TicketListScreen basePath="/(admin)/tickets" />;
}