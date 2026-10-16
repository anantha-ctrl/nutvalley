import LegalPage from './LegalPage';

const intro = 'At Beadsboutique, we respect your privacy and are committed to protecting your personal information. This Privacy Policy explains how we collect, use, store, share and safeguard your personal data when you visit our website, purchase our products or interact with our services. By continuing to use this website, you consent to our use of cookies in accordance with this Privacy Policy and agree to the practices described here.';

const sections = [
  ['Information We Collect', [
    'We may collect: Full Name, Email Address, Mobile Number, Billing & Shipping Address, Payment Information (processed securely through third-party payment gateways), Order History, IP Address, Browser & Device Information, Website Usage Data, Communications with Customer Support and Marketing Preferences.',
    'We collect only the information reasonably necessary to provide our products and services.',
  ]],
  ['How We Use Your Information', [
    'Your information may be used to process and fulfil orders, deliver products, provide customer support, verify transactions, prevent fraud and unauthorized activities, improve our products, website and services, respond to enquiries and complaints, and comply with legal and regulatory obligations.',
    "We will send promotional emails, SMS or WhatsApp communications only where you have provided your consent or where otherwise permitted under applicable law. You may withdraw your consent at any time by clicking the 'Unsubscribe' link or by contacting Customer Support.",
  ]],
  ['Payment Security', 'Beadsboutique does not store your complete debit card, credit card or banking credentials. All payments are securely processed through trusted third-party payment gateway providers using industry-standard encryption and security protocols.'],
  ['Cookies & Similar Technologies', 'Our website may use cookies and similar technologies to improve website functionality, remember customer preferences, analyse website traffic, improve user experience and measure marketing performance. You may disable cookies through your browser settings; however, certain website features may not function properly.'],
  ['Sharing of Information', [
    'Beadsboutique does not sell, rent or trade your personal information.',
    'Your information may be shared only with trusted third-party service providers where necessary, including payment gateway providers, shipping and logistics partners, website hosting providers, analytics providers, customer support platforms and government authorities where required by law.',
    'These service providers process your information only to the extent necessary to perform their services and are required to protect your information in accordance with applicable laws and their own privacy obligations.',
  ]],
  ['Data Security', 'Beadsboutique implements reasonable technical, administrative and organizational safeguards to protect your personal information against unauthorized access, alteration, disclosure, misuse or destruction. While we strive to protect your data, no internet transmission or electronic storage system can be guaranteed to be 100% secure.'],
  ['Data Retention', [
    'We retain your personal information only for as long as necessary to fulfil the purposes described in this Privacy Policy and to comply with applicable legal, tax, accounting and regulatory requirements.',
    'Order, billing and transaction records are retained for the period required under applicable laws.',
    'Marketing preferences and promotional communication records are retained until you withdraw your consent or request deletion where permitted by law.',
  ]],
  ['Your Privacy Rights', [
    'Subject to applicable laws, you may request to access, correct, update or delete eligible personal information and withdraw consent for marketing communications.',
    "To exercise your privacy rights, please email beadsboutiquejewellery@gmail.com with the subject line 'Privacy Request – [Your Name]'. We will acknowledge your request promptly and respond within the timeframe required under applicable law.",
  ]],
  ['Digital Personal Data Protection Act, 2023 (India)', 'Beadsboutique processes personal data in accordance with the Digital Personal Data Protection Act, 2023 (India) and other applicable laws. Where required, we obtain your consent before processing your personal data and respect your rights available under applicable law.'],
  ['International Data Transfers', 'Some trusted service providers engaged by Beadsboutique may process personal information on servers located outside India. Where applicable, we take reasonable steps to ensure such processing is carried out with appropriate safeguards and in accordance with applicable data protection laws.'],
  ["Children's Privacy", 'Our website is intended for individuals aged 18 years or above. We do not knowingly collect personal information from children.'],
  ['Third-Party Links', 'Our website may contain links to third-party websites. Beadsboutique is not responsible for the privacy practices, policies or content of third-party websites. Customers are encouraged to review their privacy policies before sharing personal information.'],
  ['Grievance Officer', 'For privacy-related concerns or grievances, email beadsboutiquejewellery@gmail.com. Response Time: within 30 days of receiving your complaint or within the period prescribed under applicable law.'],
  ['Policy Updates', 'Beadsboutique may update this Privacy Policy from time to time. The latest version will always be available on our official website. Continued use of our website constitutes acceptance of the updated Privacy Policy.'],
  ['Contact Us', 'For privacy-related questions, email beadsboutiquejewellery@gmail.com. Business Hours: Monday – Saturday, 10:00 AM – 6:00 PM IST.'],
];

export default function Privacy() {
  return <LegalPage eyebrow="Legal" title="Privacy Policy" intro={intro} sections={sections} />;
}
