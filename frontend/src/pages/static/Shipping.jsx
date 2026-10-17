import LegalPage from './LegalPage';

const sections = [
  ['1. Shipping Areas', 'We deliver to specific regions across India. For areas outside our regular service regions, additional shipping fees may apply.'],
  ['2. Delivery Time', 'Orders are processed within [e.g., 1-3 business days] and delivered within [e.g., 5-10 business days]. Delivery times may vary depending on your location and carrier availability.'],
  ['3. Shipping Charges', 'Shipping charges are calculated based on the destination and order weight and will be displayed at checkout.'],
  ['4. Tracking', 'Once your order is shipped, you will receive a tracking link to monitor the progress of your delivery.'],
  ['5. Delays and Exceptions', 'Delays may occur during peak seasons or due to unforeseen circumstances. We will notify you of any significant delays.'],
];

export default function Shipping() {
  return <LegalPage eyebrow="Legal" title="Shipping & Delivery Policy" sections={sections} />;
}
