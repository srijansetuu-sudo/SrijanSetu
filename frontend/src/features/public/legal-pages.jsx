import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { Card, CardContent } from "@/components/ui/card";

const lastUpdated = "15 August 2026";

function Section({ title, children }) {
  return (
    <section className="grid gap-3">
      <h2 className="text-xl font-bold text-primary">{title}</h2>
      <div className="grid gap-3 text-sm leading-7 text-muted-foreground">{children}</div>
    </section>
  );
}

function List({ items }) {
  return (
    <ul className="grid gap-2 pl-5">
      {items.map((item) => <li key={item} className="list-disc">{item}</li>)}
    </ul>
  );
}

function LegalPage({ eyebrow, title, description, children }) {
  return (
    <>
      <Navbar />
      <main className="container-page py-10">
        <div className="mx-auto max-w-4xl">
          <p className="text-sm font-semibold uppercase text-muted-foreground">{eyebrow}</p>
          <h1 className="mt-2 text-4xl font-bold leading-tight text-primary">{title}</h1>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">{description}</p>
          <Card className="mt-8">
            <CardContent className="grid gap-8">
              {children}
              <p className="text-sm font-semibold text-primary">Last updated: {lastUpdated}</p>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </>
  );
}

export function PrivacyPolicyPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Privacy Policy"
      description="This Privacy Policy explains how SrijanSetu collects, uses, and protects information while connecting customers with artists and creators."
    >
      <Section title="About SrijanSetu">
        <p>SrijanSetu is a marketplace platform where customers can post creative requirements, creators can submit quotations, and both parties can manage accepted projects through workspaces.</p>
      </Section>

      <Section title="Information We Collect">
        <List items={[
          "Account information such as name, email address, role, profile photo, phone number, address, city, state, and postal code where provided.",
          "Customer project requirements, budgets, deadlines, uploaded reference images, and related project details.",
          "Creator profile information such as studio or artist name, headline, description, years of experience, categories, portfolio links, and social links where provided.",
          "Quotation, order, workspace, message, file, review, notification, complaint, and support-request information created through the platform.",
          "Payment records needed for order tracking, such as Razorpay order IDs, Razorpay payment IDs, payment amount, payment status, and payment method labels.",
          "Technical and security information generated through normal use of the platform, such as authentication tokens, login timestamps, and operational logs where maintained by the application or hosting environment.",
        ]} />
      </Section>

      <Section title="Payment Information">
        <p>Payments are processed through Razorpay or the payment gateway configured for SrijanSetu. SrijanSetu stores transaction references needed to verify and manage payments, but it does not directly store sensitive payment credentials such as complete card numbers, CVV, or UPI PIN.</p>
      </Section>

      <Section title="How We Use Information">
        <List items={[
          "To create and manage user accounts.",
          "To let customers post requirements and creators respond with quotations.",
          "To operate workspaces, messages, uploads, reviews, notifications, payments, complaints, and support workflows.",
          "To verify payments, prevent misuse or fraud, and maintain platform security.",
          "To help customers and creators coordinate project-related communication and delivery where applicable.",
          "To improve SrijanSetu, troubleshoot issues, and respond to user requests.",
        ]} />
      </Section>

      <Section title="Sharing of Information">
        <p>Information may be shared between customers and creators when required for marketplace workflows, such as project details, quotations, workspace communication, and contact details needed to coordinate a project. Information may also be shared with service providers that help operate the platform, including payment gateways, hosting providers, file storage providers, email services, analytics or logging tools where configured, and support tools.</p>
      </Section>

      <Section title="Data Security and Retention">
        <p>SrijanSetu uses authentication, role-based access controls, and standard application security practices to protect user data. We retain account, project, payment, support, and operational records for as long as needed to provide the service, meet legal or business requirements, resolve disputes, prevent misuse, and maintain platform records.</p>
      </Section>

      <Section title="User Requests">
        <p>Users may contact SrijanSetu to request help with account information, privacy questions, support issues, or data-related concerns. Requests can be submitted through the existing Contact Us page.</p>
      </Section>

      <Section title="Contact">
        <p>For privacy-related questions, contact SrijanSetu through the Contact Us page at /contact or by using the contact email configured for the platform.</p>
      </Section>
    </LegalPage>
  );
}

export function TermsAndConditionsPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Terms & Conditions"
      description="These Terms & Conditions govern use of the SrijanSetu marketplace by customers, creators, and other users."
    >
      <Section title="Introduction">
        <p>SrijanSetu provides a platform for customers to discover creators, post project requirements, receive quotations, make payments, and manage project communication. SrijanSetu is a marketplace platform and does not itself create the handmade goods or creative work listed by creators.</p>
      </Section>

      <Section title="Eligibility and Accounts">
        <p>Users are responsible for providing accurate account information, maintaining the confidentiality of login credentials, and using the platform only for lawful purposes. Customers, creators, and admins may have different access permissions based on their role.</p>
      </Section>

      <Section title="Customer Responsibilities">
        <List items={[
          "Post accurate project requirements, budgets, timelines, references, and other necessary details.",
          "Review quotations carefully before accepting.",
          "Make required payments through the platform checkout when applicable.",
          "Coordinate project details, revisions, completion, and delivery directly with the creator through the workspace where applicable.",
          "Avoid abusive, fraudulent, unlawful, or misleading activity.",
        ]} />
      </Section>

      <Section title="Creator Responsibilities">
        <List items={[
          "Maintain accurate profile, category, quotation, timeline, and portfolio information.",
          "Submit quotations only for work the creator can reasonably deliver.",
          "Communicate clearly with customers about scope, revisions, timelines, delivery coordination, and completion.",
          "Upload or share only content the creator has the right to use.",
          "Avoid fraudulent, misleading, infringing, or abusive activity.",
        ]} />
      </Section>

      <Section title="Requirements, Quotations, and Acceptance">
        <p>Customers may post requirements, and creators may submit quotations describing price, timeline, revisions, and relevant notes. A quotation should be treated as accepted only after the required payment is successfully completed and recorded by SrijanSetu. If a checkout is opened but payment is cancelled, failed, or not verified, the quotation may remain pending or payment-pending rather than accepted.</p>
      </Section>

      <Section title="Project Payments and Commission">
        <p>After a customer accepts a quotation, SrijanSetu asks the customer to pay the full quoted project amount upfront through the platform checkout. The payment stays with SrijanSetu while the project is in progress and is handled according to the existing payment and payout workflow. SrijanSetu may apply a platform commission according to its configured business logic, and creator receivables or payouts are calculated after applicable commission deductions.</p>
      </Section>

      <Section title="Creator Payments and Payouts">
        <p>Customer payments may be held while a project is in progress. Creator payout becomes applicable according to the existing SrijanSetu payout workflow, usually after the project is completed and required confirmations or admin payout records are completed. SrijanSetu may require transaction details, admin review, or payout status updates before a payout is considered completed.</p>
      </Section>

      <Section title="Delivery and Completion">
        <p>SrijanSetu currently does not provide delivery logistics. Customers and creators must coordinate delivery directly. Platform delivery support may be added in the future. A project should be marked complete only after delivery or handover has occurred and the relevant completion workflow has been followed.</p>
      </Section>

      <Section title="Content and Intellectual Property">
        <p>Users remain responsible for the content they upload, including requirement details, reference images, profile content, quotations, messages, files, and reviews. Users must not upload content that infringes another person’s rights or violates law. SrijanSetu may remove or restrict content or accounts that violate these Terms.</p>
      </Section>

      <Section title="Prohibited Activities">
        <List items={[
          "Fraud, impersonation, payment misuse, or attempts to bypass platform processes.",
          "Uploading unlawful, abusive, misleading, infringing, or harmful content.",
          "Harassment, spam, security attacks, scraping, or misuse of platform APIs.",
          "Using SrijanSetu for illegal goods, services, or transactions.",
        ]} />
      </Section>

      <Section title="Disputes, Cancellations, and Refunds">
        <p>Customers and creators should first use the workspace and Contact Us page to raise project concerns. Cancellations, refunds, failed payments, duplicate payments, and disputes are handled according to the Refund & Cancellation Policy and the existing SrijanSetu support process.</p>
      </Section>

      <Section title="Platform Availability and Liability">
        <p>SrijanSetu aims to keep the platform available and reliable, but it does not guarantee uninterrupted access. To the extent permitted by law, SrijanSetu is not liable for indirect losses, creator or customer conduct, delivery coordination outside the platform, or outcomes outside its reasonable control.</p>
      </Section>

      <Section title="Suspension, Termination, and Changes">
        <p>SrijanSetu may suspend or restrict accounts that misuse the platform, violate these Terms, or create security, fraud, legal, or operational risk. These Terms may be updated from time to time, and continued use of the platform after changes means the user accepts the updated Terms.</p>
      </Section>

      <Section title="Contact">
        <p>Questions about these Terms can be submitted through the existing Contact Us page at /contact.</p>
      </Section>
    </LegalPage>
  );
}

export function RefundCancellationPolicyPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Refund & Cancellation Policy"
      description="This policy explains how SrijanSetu handles cancellations, failed payments, duplicate payments, refunds, and project disputes."
    >
      <Section title="Payment Context">
        <p>SrijanSetu records payments through its existing order and Razorpay payment workflow. After a customer accepts a quotation, the customer pays the full quoted project amount upfront through the platform checkout. That payment is held while the project is in progress and is handled according to the existing SrijanSetu payment, completion, and payout workflow.</p>
      </Section>

      <Section title="Customer Cancellation">
        <p>A customer may request cancellation through the Contact Us page or the relevant workspace/support process. Whether a refund is approved depends on project status, payment status, creator work already started, delivery or handover progress, and any dispute review by SrijanSetu. SrijanSetu should not treat a checkout that was opened and then cancelled as a successful accepted quotation unless payment is verified.</p>
      </Section>

      <Section title="Creator Cancellation or Project Cannot Proceed">
        <p>If a creator cannot proceed, or if a project cannot reasonably continue, the customer should contact SrijanSetu with the order details. SrijanSetu may review the project, payment records, workspace communication, and creator/customer inputs before deciding whether a refund, cancellation, replacement arrangement, or other resolution is appropriate.</p>
      </Section>

      <Section title="Failed, Pending, or Unrecorded Payments">
        <p>If payment fails or is cancelled in the payment gateway, SrijanSetu should not mark the quotation as accepted solely because checkout was opened. If money is deducted from the customer’s account but the payment is not successfully recorded by SrijanSetu, the customer should contact SrijanSetu with payment details, Razorpay/payment reference if available, date, amount, and account email. Resolution may depend on confirmation from the payment gateway or bank.</p>
      </Section>

      <Section title="Duplicate Payments">
        <p>If duplicate payment is suspected for the same order, the customer should contact SrijanSetu with both payment references and related order details. SrijanSetu may verify the payment records and coordinate refund or adjustment for any confirmed duplicate payment according to the payment gateway process.</p>
      </Section>

      <Section title="Refund Requests and Processing">
        <p>Refund requests can be raised through the Contact Us page at /contact. Approved refunds are processed through the appropriate payment or administrative workflow available to SrijanSetu. Refund timing may depend on Razorpay, banking partners, payment method, and administrative review. SrijanSetu should avoid promising a fixed refund timeline unless that timeline is formally confirmed by its payment provider and internal process.</p>
      </Section>

      <Section title="Disputes">
        <p>Project disputes may involve review of the requirement, quotation, workspace messages, uploaded files, delivery status, completion confirmations, payment records, and support submissions. SrijanSetu may use this information to decide whether cancellation, refund, payout hold, payout release, or another action is appropriate.</p>
      </Section>

      <Section title="Contact">
        <p>For refund, cancellation, failed payment, or duplicate payment concerns, use the existing Contact Us page at /contact and include the order ID, payment reference, amount, date, and a clear description of the issue.</p>
      </Section>
    </LegalPage>
  );
}
