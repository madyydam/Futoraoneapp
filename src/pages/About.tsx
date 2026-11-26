import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Code, Users, Zap, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";

const About = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Code,
      title: "Project Showcase",
      description: "Share your tech projects, code, and innovations with the community",
    },
    {
      icon: Users,
      title: "Connect & Collaborate",
      description: "Find like-minded developers and work on exciting projects together",
    },
    {
      icon: Zap,
      title: "Real-time Updates",
      description: "Stay updated with the latest trends in AI, ML, Web Dev, and more",
    },
    {
      icon: Shield,
      title: "Secure Platform",
      description: "Your data and projects are protected with enterprise-grade security",
    },
  ];

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
          <h1 className="text-2xl font-bold text-foreground">About One</h1>
        </div>
      </div>

      <div className="p-6 max-w-3xl mx-auto space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <div className="w-24 h-24 mx-auto bg-primary rounded-full flex items-center justify-center tech-glow">
            <Code size={48} className="text-primary-foreground" />
          </div>
          <h2 className="text-3xl font-bold text-foreground">One Tech Community</h2>
          <p className="text-muted-foreground text-lg">
            Where tech enthusiasts share ideas, projects, and innovations
          </p>
        </div>

        {/* Mission Statement */}
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <h3 className="text-xl font-bold text-foreground mb-3">Our Mission</h3>
            <p className="text-muted-foreground leading-relaxed">
              One is built for developers, engineers, and tech enthusiasts who want to share their
              work, learn from others, and build amazing things together. We provide a platform where
              innovation meets collaboration, and where every project can find its audience.
            </p>
          </CardContent>
        </Card>

        {/* Features Grid */}
        <div>
          <h3 className="text-2xl font-bold text-foreground mb-4">What We Offer</h3>
          <div className="grid md:grid-cols-2 gap-4">
            {features.map((feature, index) => (
              <Card key={index} className="bg-card border-border">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="bg-primary/10 p-3 rounded-lg">
                      <feature.icon className="text-primary" size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground mb-2">{feature.title}</h4>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Stats */}
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <p className="text-3xl font-bold text-foreground">10K+</p>
                <p className="text-sm text-muted-foreground">Active Users</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">5K+</p>
                <p className="text-sm text-muted-foreground">Projects Shared</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">50K+</p>
                <p className="text-sm text-muted-foreground">Daily Updates</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tech Categories */}
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <h3 className="text-xl font-bold text-foreground mb-3">Featured Categories</h3>
            <div className="flex flex-wrap gap-2">
              {["AI & ML", "Web Dev", "Cybersecurity", "Cloud", "Robotics", "Blockchain", "IoT", "DevOps"].map((cat) => (
                <span
                  key={cat}
                  className="px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium"
                >
                  {cat}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card className="bg-card border-border">
          <CardContent className="p-6 text-center">
            <h3 className="text-xl font-bold text-foreground mb-2">Get in Touch</h3>
            <p className="text-muted-foreground mb-4">
              Have questions or feedback? We'd love to hear from you!
            </p>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              Contact Us
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default About;
