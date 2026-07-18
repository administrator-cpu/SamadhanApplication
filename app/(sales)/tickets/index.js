// app/(sales)/tickets/index.js
import TicketListScreen from '../../../src/components/TicketListScreen';

export default function SalesTicketList() {
  return <TicketListScreen basePath="/(sales)/tickets" ownership={undefined} />;
}