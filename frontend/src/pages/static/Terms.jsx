import LegalPage from './LegalPage';

const intro = 'Welcome to Beadsboutique. These Terms & Conditions govern your access to and use of the Beadsboutique website, products and services. By using our website or placing an order, you agree to these Terms.';

const sections = [
  // ['Company Information', "Beadsboutique is a registered business under GSTIN having its principal place of business at 114/160 Kemphiya Lane, St. Mary's Hill, Ooty, Tamil Nadu, India."],
  ['Eligibility', 'Users must be 18+ or supervised by a guardian. Jewellery containing small beads or parts is not suitable for young children and should be kept out of their reach.'],
  ['Products', 'Images are illustrative. As our pieces are handcrafted, beads may vary slightly in colour, shape and size between batches. Packaging may vary. Availability is subject to stock. Product availability displayed on the website is subject to change without prior notice.'],
  ['Product Care', 'Keep jewellery away from water, perfume, lotions and chemicals. Store pieces separately in a dry pouch and remove them before sleeping, bathing, swimming or exercising.'],
  ['Material Disclaimer', 'Unless stated otherwise, our jewellery is fashion jewellery made with beads and base-metal findings and is not gold, silver or precious-metal jewellery. Discontinue use if you notice any skin irritation.'],
  ['Pricing', 'All prices are in INR and inclusive of applicable GST unless otherwise stated during checkout.'],
  ['Payments', 'Orders are processed after successful payment authorization.'],
  ['Order Acceptance', 'Beadsboutique may reject or cancel orders due to pricing errors, fraud, stock issues or operational limitations.'],
  ['Shipping', 'Governed by the Beadsboutique Shipping Policy.'],
  ['Returns', 'Governed by the Beadsboutique Returns, Replacements & Refund Policy.'],
  ['Promotions', 'Offers may not be combined unless stated. First-time offers are limited to one per customer and one per household. Misused promotions may be cancelled.'],
  ['Subscription', 'Subscription orders may be paused, modified or cancelled before the next billing cycle.'],
  ['Customer Responsibilities', 'Provide accurate information and follow product instructions.'],
  ['Intellectual Property', 'All website content, including logos, trademarks, product names, product descriptions, images, graphics and other brand assets, is the intellectual property of Beadsboutique unless otherwise stated and may not be copied, reproduced or used without prior written permission.'],
  ['Reviews', 'User-submitted content may be used by Beadsboutique for promotional purposes.'],
  ['Fraud Prevention', 'Fraudulent transactions may be cancelled or restricted.'],
  ['Privacy', 'Handled according to the Beadsboutique Privacy Policy.'],
  ['Force Majeure', 'Beadsboutique is not liable for delays caused by events beyond reasonable control.'],
  ['AI & Information Disclaimer', 'Website and social media content is for general information and styling inspiration only. Information generated using artificial intelligence, blogs, FAQs, customer support, advertisements or social media may not always be complete or accurate.'],
  ['Limitation of Liability', 'Liability is limited to refund or replacement where applicable and does not limit statutory consumer rights.'],
  ['Governing Law', 'Governed by Indian law with exclusive jurisdiction of the courts of Nilgiris District, Tamil Nadu.'],
  ['Severability', 'Invalid provisions do not affect the remaining Terms.'],
  ['Changes', 'Beadsboutique may update these Terms without prior notice.'],
  ['Contact', 'Email: beadsboutiquejewellery@gmail.com'],
];

export default function Terms() {
  return <LegalPage eyebrow="Legal" title="Terms & Conditions" intro={intro} sections={sections} />;
}
