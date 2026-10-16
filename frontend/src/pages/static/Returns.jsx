import LegalPage from './LegalPage';

const intro = 'At Beadsboutique, we are committed to delivering beautifully finished, high-quality handcrafted jewellery. Due to the personal and hygienic nature of jewellery (especially earrings), we maintain a strict No Returns Policy while ensuring fair replacements and refunds wherever applicable.';

const sections = [
  ['No Returns Policy', 'Beadsboutique does not accept returns once an order has been delivered. Jewellery, and earrings in particular, cannot be resold after delivery because its handling and hygiene cannot be verified.'],
  ['Eligible Replacement & Refund Cases', 'Replacement or refund requests may be approved if you receive the wrong product, a product damaged during transit, a product with a broken/tampered package, missing items, or a verified manufacturing defect such as a broken clasp or loose stringing on arrival.'],
  ['Cases Not Eligible', 'Claims will not be accepted for change of mind, incorrect product ordered, size or colour preference, worn or used products, damage caused by water, perfume, chemicals or rough handling after delivery, natural variations in handmade beads, late claims, minor packaging changes, or skin sensitivity/allergic reactions. Please check the material details before purchase if you have metal sensitivities.'],
  ['Reporting Timeline', 'All claims must be reported within 72 hours of delivery. Claims submitted later may not be accepted unless required by applicable law.'],
  ['Required Proof', [
    'Please provide the following when raising a claim:',
    ['Your order number', 'Clear product photographs', 'Outer package photographs', 'A continuous unboxing video from before opening the parcel', 'A brief description of the issue'],
  ]],
  ['Claim Review', 'Refund or replacement approval/rejection will be communicated within 3 business days after receiving complete evidence. Beadsboutique may request additional information. Decisions are made after verification.'],
  ['Replacement Policy', 'If approved and stock is available, a replacement will be dispatched at no additional cost.'],
  ['Refund Policy', [
    'If a replacement is unavailable, Beadsboutique may issue a refund. Approved refunds are processed within 7–10 business days. COD refunds are processed via bank transfer or another approved method.',
    'Shipping charges are generally non-refundable unless the error is attributable to Beadsboutique. Partial refunds or replacements may be offered where only part of an order is affected. Orders cancelled due to non-serviceable PIN codes receive a full refund including applicable shipping charges.',
    'Refunds are issued only to the original payment source wherever technically feasible.',
  ]],
  ['Cancellation Policy', 'Cancellation requests should preferably be submitted within 12 hours of placing the order. Requests after this period may not be accommodated even if the order has not yet been dispatched. Orders cannot be cancelled after dispatch.'],
  ['Damaged or Tampered Deliveries', 'If a parcel appears damaged, opened or tampered with, refuse delivery where possible and contact Beadsboutique immediately. If accepted, report the issue within 72 hours with the required evidence.'],
  ['Product Safety', 'Do not wear products with sharp edges, broken findings, visible damage or signs of tampering. Contact Beadsboutique immediately.'],
  ['Misuse of Policy', 'Fraudulent, misleading or abusive claims may be rejected and may result in restriction of future purchases or COD eligibility.'],
  ['Limitation of Liability', "Beadsboutique's liability is limited to replacement or refund of the affected product/order as applicable. Nothing in this policy limits rights available under applicable Indian consumer protection laws."],
  ['Customer Support', 'Email: beadsboutiquejewellery@gmail.com. Hours: Monday–Saturday, 10:00 AM–6:00 PM IST.'],
  ['Policy Updates', 'Beadsboutique may update this policy without prior notice. The latest version will always be available on our website. Continued use of our services constitutes acceptance of the updated policy.'],
];

export default function Returns() {
  return <LegalPage eyebrow="Legal" title="Returns, Replacements & Refund Policy" intro={intro} sections={sections} />;
}
