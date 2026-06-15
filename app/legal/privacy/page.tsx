import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — BFS Inventory",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16 text-sm leading-relaxed">
      <h1 className="text-2xl font-semibold mb-2">Privacy Policy</h1>
      <p className="text-muted-foreground mb-8">Last updated: June 2026</p>

      <section className="space-y-6">
        <div>
          <h2 className="font-semibold mb-1">1. Overview</h2>
          <p>
            BFS Inventory is an internal warehouse management tool operated by
            Beauty Logix Inc. for the exclusive use of authorized Beauty First /
            Beauty Logix staff. It is not a public-facing application and is not
            available to third parties.
          </p>
        </div>

        <div>
          <h2 className="font-semibold mb-1">2. Data We Collect</h2>
          <p>
            We collect and store only the data necessary to operate the
            inventory system:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>
              User account information (name, email) via Google or GitHub OAuth
              sign-in
            </li>
            <li>
              QuickBooks Online data synced via the Intuit API: product
              catalog, stock quantities, and sales history belonging to Beauty
              Logix Inc.
            </li>
            <li>
              Inventory transactions, purchase orders, and stock adjustments
              entered by authorized users
            </li>
          </ul>
        </div>

        <div>
          <h2 className="font-semibold mb-1">3. How We Use Data</h2>
          <p>
            Data is used solely to display inventory levels, generate reorder
            reports, and send internal low-stock email notifications to
            Beauty Logix staff. We do not use data for advertising, profiling,
            or any purpose unrelated to warehouse operations.
          </p>
        </div>

        <div>
          <h2 className="font-semibold mb-1">4. Data Sharing</h2>
          <p>
            We do not sell, rent, or share any data with third parties. Data is
            stored in a Neon PostgreSQL database (AWS us-east-1) accessible only
            to authorized developers and the application itself.
          </p>
        </div>

        <div>
          <h2 className="font-semibold mb-1">5. QuickBooks Data</h2>
          <p>
            This application connects to QuickBooks Online via OAuth 2.0 to
            read product and sales data owned by Beauty Logix Inc. We do not
            write data back to QuickBooks. OAuth tokens are stored securely
            and are never shared outside the application.
          </p>
        </div>

        <div>
          <h2 className="font-semibold mb-1">6. Security</h2>
          <p>
            All data is transmitted over HTTPS. Access is restricted to a
            fixed allowlist of authorized email addresses. Sessions expire
            after 7 days of inactivity.
          </p>
        </div>

        <div>
          <h2 className="font-semibold mb-1">7. Contact</h2>
          <p>
            For questions about this policy, contact:{" "}
            <a href="mailto:order@beautylogix.ca" className="underline">
              order@beautylogix.ca
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}
