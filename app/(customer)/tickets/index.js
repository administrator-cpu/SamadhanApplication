// app/(customer)/tickets/index.js
import TicketListScreen from '../../../src/components/TicketListScreen';

export default function CustomerTicketList() {
  return <TicketListScreen basePath="/(customer)/tickets" />;
}