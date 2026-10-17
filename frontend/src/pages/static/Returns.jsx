import LegalPage from './LegalPage';

const sections = [
  ['1. Order Cancellation', 'If you wish to cancel your order, please contact us within [specified time, e.g., 24 hours] of placing the order. Orders cannot be canceled once they have been shipped.'],
  ['2. Return and Refund', 'We strive to ensure quality, but if you receive a damaged or incorrect item, please notify us within [specified time, e.g., 1 day] of receiving it. Eligible returns must be unused and in original packaging. Refunds will be processed upon receipt and inspection of the returned item. If a return is not available, you may courier the item to our team for further assistance.'],
  ['3. Exchange Policy', 'Exchanges are allowed for defective or damaged items only. For size or design exchanges, additional charges may apply and are subject to availability.'],
  ['4. Refund Process', 'Once your return is approved, the refund will be processed within [specified time, e.g., 5-7 business days]. Payment method fees may apply'],
];

export default function Returns() {
  return <LegalPage eyebrow="Legal" title="Cancellation and Refund Policy" sections={sections} />;
}
