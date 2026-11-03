import LegalPage from './LegalPage';

const sections = [
  ['Introduction', 'By accessing or using NutValley’s website, you agree to comply with these Terms & Conditions. If you disagree with any part of the terms, please do not use our website.'],
  ['1. Orders and Payments', 'When you place an order, you agree to provide accurate and current information. Prices and availability are subject to change without notice. Payment must be completed for the order to be processed.'],
  ['2. Product Descriptions', 'We aim to describe our products accurately. However, slight variations in color or design may occur due to screen settings or handwork.'],
  ['3. Intellectual Property', 'All content on this website, including images, logos, and text, is the property of NutValley and may not be used without permission.'],
  ['4. Limitation of Liability', 'We are not liable for any indirect or consequential losses arising from the use of our website or products, to the fullest extent permitted by law.'],
  ['5. Changes to Terms', 'NutValley reserves the right to update these terms at any time. Changes will be effective immediately upon posting.'],
];

export default function Terms() {
  return <LegalPage eyebrow="Legal" title="Terms & Conditions" sections={sections} />;
}
