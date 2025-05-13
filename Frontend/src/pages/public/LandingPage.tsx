import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ActivitySquare, 
  Globe, 
  Shield, 
  Gauge, 
  Clock, 
  Wallet, 
  CheckCircle,
  ArrowRight,
  Users,
  Server,
  LineChart
} from 'lucide-react';

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-dark-950 text-white">
      {/* Header */}
      <header className="glassmorphism border-b border-dark-800 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <ActivitySquare size={28} className="text-primary-500" />
            <span className="text-xl font-bold tracking-wide">upWeb</span>
          </div>
          
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-sm text-dark-300 hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm text-dark-300 hover:text-white transition-colors">How It Works</a>
            <a href="#pricing" className="text-sm text-dark-300 hover:text-white transition-colors">Pricing</a>
          </nav>
          
          <div className="flex items-center gap-4">
            <Link to="/login" className="btn btn-outline py-1.5 px-4 text-sm hidden sm:block">
              Sign In
            </Link>
            <Link to="/register" className="btn btn-primary py-1.5 px-4 text-sm">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary-900/10 to-dark-950"></div>
        <div className="absolute -top-48 -right-48 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-48 -left-48 w-96 h-96 bg-secondary-600/10 rounded-full blur-3xl"></div>
        
        <div className="container mx-auto px-4 py-20 md:py-32 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-block py-1 px-3 rounded-full text-xs font-medium bg-dark-800 text-primary-400 mb-6">
                Decentralized Website Monitoring
              </span>
              
              <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-primary-300 to-white">
                Monitor Your Web Presence With Community Power
              </h1>
              
              <p className="text-lg md:text-xl text-dark-300 mb-10 max-w-2xl mx-auto">
                upWeb leverages a decentralized network of contributors to provide real-time monitoring of your websites from multiple global locations.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/register" className="btn btn-primary py-3 px-8">
                  Start Monitoring
                </Link>
                <Link to="/register?type=contributor" className="btn btn-outline py-3 px-8">
                  Become a Contributor
                </Link>
              </div>
            </motion.div>

            {/* Statistics */}
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-16 flex flex-wrap justify-center gap-8"
            >
              <div className="card-gradient p-4 min-w-32">
                <div className="text-2xl md:text-3xl font-bold text-primary-400">5,000+</div>
                <div className="text-sm text-dark-400">Websites Monitored</div>
              </div>
              
              <div className="card-gradient p-4 min-w-32">
                <div className="text-2xl md:text-3xl font-bold text-secondary-400">98.7%</div>
                <div className="text-sm text-dark-400">Uptime Accuracy</div>
              </div>
              
              <div className="card-gradient p-4 min-w-32">
                <div className="text-2xl md:text-3xl font-bold text-accent-400">500+</div>
                <div className="text-sm text-dark-400">Global Contributors</div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-dark-900/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Powerful Monitoring Features
            </h2>
            <p className="text-dark-300 max-w-2xl mx-auto">
              Our platform provides comprehensive tools to ensure your websites stay online and perform optimally
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: <Globe className="text-primary-500" size={32} />,
                title: "Global Monitoring",
                description: "Check your website from multiple locations around the world for a complete view of performance and availability."
              },
              {
                icon: <Gauge className="text-success-500" size={32} />,
                title: "Performance Metrics",
                description: "Track response times, uptime percentages, and other critical performance indicators in real-time."
              },
              {
                icon: <Shield className="text-secondary-500" size={32} />,
                title: "Instant Alerts",
                description: "Receive immediate notifications when your website experiences downtime or performance issues."
              },
              {
                icon: <Clock className="text-warning-500" size={32} />,
                title: "Historical Data",
                description: "Access detailed historical performance data to identify trends and make informed decisions."
              },
              {
                icon: <LineChart className="text-accent-500" size={32} />,
                title: "Detailed Reports",
                description: "Generate comprehensive reports on website performance, uptime, and user experience metrics."
              },
              {
                icon: <Wallet className="text-primary-500" size={32} />,
                title: "Fair Payment System",
                description: "Contributors earn rewards for providing monitoring services while users pay only for what they need."
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="card-gradient h-full"
              >
                <div className="flex flex-col h-full">
                  <div className="rounded-full w-12 h-12 bg-dark-800 flex items-center justify-center mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                  <p className="text-dark-300 text-sm flex-grow">{feature.description}</p>
                  <div className="mt-4 pt-4 border-t border-dark-800">
                    <a href="#" className="text-primary-400 text-sm flex items-center">
                      Learn more <ArrowRight size={14} className="ml-1" />
                    </a>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              How upWeb Works
            </h2>
            <p className="text-dark-300 max-w-2xl mx-auto">
              Our decentralized approach ensures reliable, accurate monitoring from anywhere in the world
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              {
                icon: <Users className="text-primary-500" size={40} />,
                title: "Join the Network",
                description: "Sign up as a user to monitor your websites or become a contributor to earn rewards.",
                step: "01"
              },
              {
                icon: <Server className="text-secondary-500" size={40} />,
                title: "Create Monitors",
                description: "Set up monitoring for your websites with customizable check intervals and alert preferences.",
                step: "02"
              },
              {
                icon: <CheckCircle className="text-success-500" size={40} />,
                title: "Receive Insights",
                description: "Get detailed analytics and instant notifications about your website's performance.",
                step: "03"
              }
            ].map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5, delay: index * 0.2 }}
                className="relative"
              >
                <div className="card-gradient h-full">
                  <div className="absolute -top-5 -right-5 bg-dark-950 w-10 h-10 rounded-full flex items-center justify-center border border-dark-800 text-sm font-bold">
                    {step.step}
                  </div>
                  <div className="flex flex-col items-center text-center h-full">
                    <div className="rounded-full w-16 h-16 bg-dark-800 flex items-center justify-center mb-4">
                      {step.icon}
                    </div>
                    <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                    <p className="text-dark-300 text-sm">{step.description}</p>
                  </div>
                </div>
                
                {index < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-px bg-dark-700"></div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 bg-dark-900/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-dark-300 max-w-2xl mx-auto">
              Pay only for what you need with no hidden fees or long-term commitments
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                title: "Starter",
                price: "$9",
                description: "Perfect for small websites and blogs",
                features: [
                  "3 Website Monitors",
                  "Hourly Checks",
                  "Email Alerts",
                  "7-Day History",
                  "Basic Reports"
                ],
                cta: "Get Started",
                popular: false
              },
              {
                title: "Professional",
                price: "$29",
                description: "Ideal for businesses and e-commerce sites",
                features: [
                  "10 Website Monitors",
                  "15-Minute Checks",
                  "Email & SMS Alerts",
                  "30-Day History",
                  "Advanced Reports",
                  "API Access"
                ],
                cta: "Get Started",
                popular: true
              },
              {
                title: "Enterprise",
                price: "$79",
                description: "For large businesses with multiple properties",
                features: [
                  "Unlimited Monitors",
                  "5-Minute Checks",
                  "Custom Alert Channels",
                  "1-Year History",
                  "Custom Reports",
                  "Priority Support",
                  "White Labeling"
                ],
                cta: "Contact Sales",
                popular: false
              }
            ].map((plan, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`card-gradient h-full relative ${plan.popular ? 'border-primary-500' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-primary-500 text-white text-xs py-1 px-3 rounded-full">
                    Most Popular
                  </div>
                )}
                
                <div className="flex flex-col h-full">
                  <h3 className="text-xl font-bold mb-2">{plan.title}</h3>
                  <div className="mb-4">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    <span className="text-dark-400">/month</span>
                  </div>
                  <p className="text-dark-300 text-sm mb-6">{plan.description}</p>
                  
                  <ul className="space-y-3 mb-6 flex-grow">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start">
                        <CheckCircle size={16} className="text-success-500 mt-0.5 mr-2 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Link 
                    to="/register" 
                    className={`btn w-full ${plan.popular ? 'btn-primary' : 'btn-outline'}`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
          
          <div className="mt-12 text-center">
            <p className="text-dark-400 text-sm">
              All plans include a 14-day free trial. No credit card required.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto card-gradient">
            <div className="text-center p-8">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                Ready to Start Monitoring Your Websites?
              </h2>
              <p className="text-dark-300 mb-8 max-w-2xl mx-auto">
                Join thousands of websites already benefiting from upWeb's decentralized monitoring network
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/register" className="btn btn-primary py-3 px-8">
                  Get Started
                </Link>
                <Link to="/login" className="btn btn-outline py-3 px-8">
                  Sign In
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-dark-900 border-t border-dark-800">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <ActivitySquare size={24} className="text-primary-500" />
                <span className="text-xl font-bold">upWeb</span>
              </div>
              <p className="text-dark-400 text-sm mb-4">
                Decentralized website monitoring platform powered by a global network of contributors.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-dark-400 hover:text-white">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                  </svg>
                </a>
                <a href="#" className="text-dark-400 hover:text-white">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </a>
                <a href="#" className="text-dark-400 hover:text-white">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                  </svg>
                </a>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Product</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-dark-400 hover:text-white text-sm">Features</a></li>
                <li><a href="#" className="text-dark-400 hover:text-white text-sm">Pricing</a></li>
                <li><a href="#" className="text-dark-400 hover:text-white text-sm">Tutorials</a></li>
                <li><a href="#" className="text-dark-400 hover:text-white text-sm">Changelog</a></li>
                <li><a href="#" className="text-dark-400 hover:text-white text-sm">Status</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Company</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-dark-400 hover:text-white text-sm">About</a></li>
                <li><a href="#" className="text-dark-400 hover:text-white text-sm">Blog</a></li>
                <li><a href="#" className="text-dark-400 hover:text-white text-sm">Careers</a></li>
                <li><a href="#" className="text-dark-400 hover:text-white text-sm">Contact</a></li>
                <li><a href="#" className="text-dark-400 hover:text-white text-sm">Partners</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Legal</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-dark-400 hover:text-white text-sm">Privacy Policy</a></li>
                <li><a href="#" className="text-dark-400 hover:text-white text-sm">Terms of Service</a></li>
                <li><a href="#" className="text-dark-400 hover:text-white text-sm">Cookie Policy</a></li>
                <li><a href="#" className="text-dark-400 hover:text-white text-sm">GDPR</a></li>
              </ul>
            </div>
          </div>
          
          <div className="mt-12 pt-8 border-t border-dark-800 text-center">
            <p className="text-dark-400 text-sm">&copy; {new Date().getFullYear()} upWeb. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;