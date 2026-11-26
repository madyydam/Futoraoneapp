import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Terms = () => {
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
          <h1 className="text-2xl font-bold text-foreground">Terms of Service</h1>
        </div>
      </div>

      <div className="p-6 max-w-3xl mx-auto space-y-6 text-foreground">
        <section>
          <h2 className="text-xl font-bold mb-3">1. Acceptance of Terms</h2>
          <p className="text-muted-foreground leading-relaxed">
            By accessing and using One Tech Community, you accept and agree to be bound by the
            terms and provision of this agreement.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">2. Use License</h2>
          <p className="text-muted-foreground leading-relaxed">
            Permission is granted to temporarily access the platform for personal, non-commercial use
            only. This is the grant of a license, not a transfer of title.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">3. User Content</h2>
          <p className="text-muted-foreground leading-relaxed">
            You retain ownership of all content you post on One. However, by posting content, you
            grant us a worldwide, non-exclusive license to use, reproduce, and display your content on
            the platform.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">4. Prohibited Activities</h2>
          <ul className="list-disc list-inside text-muted-foreground space-y-2">
            <li>Posting spam or unauthorized advertisements</li>
            <li>Harassing or threatening other users</li>
            <li>Sharing malicious code or security vulnerabilities</li>
            <li>Impersonating others or providing false information</li>
            <li>Violating intellectual property rights</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">5. Account Termination</h2>
          <p className="text-muted-foreground leading-relaxed">
            We reserve the right to terminate or suspend accounts that violate these terms or engage in
            harmful behavior on the platform.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">6. Disclaimer</h2>
          <p className="text-muted-foreground leading-relaxed">
            The platform is provided "as is" without warranties of any kind. We do not guarantee the
            accuracy or reliability of user-generated content.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">7. Changes to Terms</h2>
          <p className="text-muted-foreground leading-relaxed">
            We reserve the right to modify these terms at any time. Continued use of the platform after
            changes constitutes acceptance of the new terms.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">8. Contact</h2>
          <p className="text-muted-foreground leading-relaxed">
            For questions about these terms, please contact us at legal@futuraone.com
          </p>
        </section>

        <p className="text-sm text-muted-foreground italic pt-6">
          Last updated: {new Date().toLocaleDateString()}
        </p>
      </div>
    </div>
  );
};

export default Terms;
