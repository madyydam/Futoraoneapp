import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Privacy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-card border-b border-border p-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="text-foreground"
          >
            <ArrowLeft size={24} />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Privacy Policy</h1>
        </div>
      </div>

      <div className="p-6 max-w-3xl mx-auto space-y-6 text-foreground">
        <section>
          <h2 className="text-xl font-bold mb-3">1. Information We Collect</h2>
          <p className="text-muted-foreground leading-relaxed mb-2">
            We collect information you provide directly to us, including:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-2">
            <li>Account information (email, username, full name)</li>
            <li>Profile information (bio, skills, social links)</li>
            <li>Content you post (projects, updates, comments)</li>
            <li>Usage data and analytics</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">2. How We Use Your Information</h2>
          <ul className="list-disc list-inside text-muted-foreground space-y-2">
            <li>To provide and improve our services</li>
            <li>To personalize your experience</li>
            <li>To communicate with you about updates and features</li>
            <li>To ensure platform security and prevent abuse</li>
            <li>To analyze usage patterns and optimize performance</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">3. Information Sharing</h2>
          <p className="text-muted-foreground leading-relaxed">
            We do not sell your personal information. We may share your information only in the following
            circumstances:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-2">
            <li>With your explicit consent</li>
            <li>To comply with legal obligations</li>
            <li>To protect our rights and prevent fraud</li>
            <li>With service providers who assist our operations</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">4. Data Storage and Security</h2>
          <p className="text-muted-foreground leading-relaxed">
            We use industry-standard security measures to protect your data. Your information is stored
            securely and encrypted in transit. However, no method of transmission over the internet is
            100% secure.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">5. Your Rights</h2>
          <ul className="list-disc list-inside text-muted-foreground space-y-2">
            <li>Access and download your data</li>
            <li>Update or correct your information</li>
            <li>Delete your account and data</li>
            <li>Opt out of communications</li>
            <li>Request data portability</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">6. Cookies and Tracking</h2>
          <p className="text-muted-foreground leading-relaxed">
            We use cookies and similar technologies to maintain your session, remember your preferences,
            and analyze platform usage. You can control cookies through your browser settings.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">7. Children's Privacy</h2>
          <p className="text-muted-foreground leading-relaxed">
            One is not intended for users under 13 years of age. We do not knowingly collect
            information from children under 13.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">8. Changes to Privacy Policy</h2>
          <p className="text-muted-foreground leading-relaxed">
            We may update this policy from time to time. We will notify you of significant changes via
            email or platform notification.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">9. Contact Us</h2>
          <p className="text-muted-foreground leading-relaxed">
            For privacy-related questions or to exercise your rights, contact us at privacy@futuraone.com
          </p>
        </section>

        <p className="text-sm text-muted-foreground italic pt-6">
          Last updated: {new Date().toLocaleDateString()}
        </p>
      </div>
    </div>
  );
};

export default Privacy;
