import LegalPage from './LegalPage';

const intro = 'At Beadsboutique, we are committed to delivering every order safely, efficiently, and on time. All products are carefully packed with tamper-evident seals to maintain integrity during transit. This Shipping Policy explains how orders are processed, shipped and delivered across India. By placing an order, you agree to the terms below.';

const sections = [
  ['Order Processing', [
    'Orders are processed only after successful payment confirmation, usually within 1–2 business days.',
    ['Orders placed on Sundays or Public Holidays are processed on the next working day.', 'During launches, promotions, festive seasons or unexpected volumes, processing may take additional time.'],
  ]],
  ['Order Confirmation', [
    'Once your order is successfully placed, you will receive an Order Confirmation Email and (if applicable) an SMS/WhatsApp confirmation. If you do not receive confirmation within 30 minutes, please contact Customer Support.',
  ]],
  ['Shipping Locations', 'Currently, Beadsboutique delivers across most serviceable PIN codes within India. Some remote or restricted locations may not be serviceable by our courier partners. If your PIN code is non-serviceable, we will inform you and issue a full refund.'],
  ['Delivery Timeline', [
    'Orders are generally processed within 1–2 business days before dispatch. Estimated delivery after dispatch:',
    ['Metro Cities: 2–4 business days', 'Tier 1 & Tier 2 Cities: 3–6 business days', 'Other Locations: 5–8 business days', 'Remote Locations: 7–12 business days'],
    'Total estimated delivery = 1–2 business days processing + the applicable delivery timeline above. Delivery timelines are estimates only and are not guaranteed.',
  ]],
  ['Shipping Charges', [
    'Shipping charges are displayed during checkout. Orders above ₹999 qualify for Free Shipping.',
    'Charges are calculated automatically at checkout based on delivery location and applicable courier rates. Beadsboutique may also offer promotional free shipping during selected campaigns. Shipping charges may change without prior notice.',
  ]],
  ['Order Tracking', [
    'Once your order is dispatched, you will receive a Tracking Number, Courier Partner Name and Tracking Link. Please allow up to 24 hours for tracking information to become active.',
  ]],
  ['Delivery Attempts', 'Courier partners generally make up to 3 delivery attempts, usually on consecutive business days. If delivery fails due to customer unavailability, incorrect address or refusal to accept, the package may be returned to us and re-shipping charges may apply.'],
  ['Incorrect Shipping Address', [
    'Customers are responsible for providing accurate shipping information. Beadsboutique will not be responsible for delays or failed deliveries resulting from:',
    ['Incorrect address', 'Wrong PIN code', 'Incorrect mobile number', 'Incomplete address details'],
    'Additional shipping charges may apply for re-dispatch.',
  ]],
  ['Change of Address', 'Address changes can only be requested before dispatch. Once an order has been handed over to the courier partner, address modifications may not be possible.'],
  ['Cash on Delivery (COD)', [
    'COD availability depends on delivery location, order value and courier availability. COD is available for orders between ₹299 and ₹1999.',
    'Beadsboutique reserves the right to disable COD for selected locations, products or customers. Repeated COD refusals may result in permanent restriction of COD for future orders.',
  ]],
  ['Delayed Deliveries', [
    'Unexpected delays may occur due to circumstances such as extreme weather, natural disasters, political unrest, strikes, transport disruptions, government restrictions, high seasonal demand or courier operational issues. Such delays are beyond Beadsboutique\'s control.',
  ]],
  ['Split Shipments', 'Orders containing multiple products may be shipped separately depending on stock availability. Customers will not be charged additional shipping fees for split shipments.'],
  ['Out of Stock Products', [
    'If any product becomes unavailable after your order is placed, Beadsboutique may:',
    ['Partially fulfil your order', 'Hold the order until stock becomes available', 'Cancel the unavailable item and issue a refund'],
    'Customers will always be informed.',
  ]],
  ['Pre-Orders', 'Products marked as "Pre-Order" will have separate dispatch timelines displayed on the product page. Orders containing both regular and pre-order items may be shipped separately.'],
  ['Damaged Packages', [
    'If your package appears torn, opened, wet or tampered, please capture clear photographs, record an unboxing video starting before opening the parcel, and contact Beadsboutique within 72 hours of delivery. Claims submitted without sufficient evidence may not be accepted.',
  ]],
  ['Missing Items', 'If any item is missing, notify us within 72 hours of delivery with your order number, unboxing video and photographs. Claims submitted after this period may not be eligible.'],
  ['Lost Shipments', 'If a shipment is confirmed lost by the courier partner, Beadsboutique will either dispatch a replacement (subject to stock availability) or issue a full refund.'],
  ['Refused Deliveries', 'If a customer refuses delivery without a valid reason, the order may be returned to Beadsboutique. Original shipping charges are non-refundable and re-shipping charges may apply. Repeated refusals may lead to cancellation of future COD eligibility.'],
  ['Delivery Delays Beyond Estimated Time', 'If your order exceeds the estimated delivery timeline, please contact Customer Support. We will coordinate directly with the courier partner to resolve the issue.'],
  ['Force Majeure', 'Beadsboutique shall not be held liable for delays or inability to fulfil deliveries caused by circumstances beyond reasonable control, including floods, earthquakes, fires, pandemics, government restrictions, acts of war, civil disturbances, transportation failures or courier disruptions.'],
  ['Customer Responsibilities', [
    ['Providing accurate address details', 'Being available to receive deliveries', 'Inspecting packages upon arrival', 'Reporting issues promptly'],
  ]],
  ['Shipping Restrictions', 'Beadsboutique currently ships only within India. International shipping is presently unavailable.'],
  ['Customer Support', 'For shipping-related queries, email beadsboutiquejewellery@gmail.com. Working Hours: Monday–Saturday, 10:00 AM – 6:00 PM IST.'],
  ['Policy Updates', 'Beadsboutique reserves the right to modify this Shipping Policy at any time without prior notice. The latest version will always be available on our official website. For returns, exchanges and refunds, please refer to our Returns & Refund Policy.'],
];

export default function Shipping() {
  return <LegalPage eyebrow="Legal" title="Shipping Policy" intro={intro} sections={sections} />;
}
