import React from 'react';

export function TactileDemo() {
  return (
    <div className="min-h-screen bg-parchment bg-grain p-8">
      {/* Hero Section */}
      <section className="max-w-4xl mx-auto mb-16">
        <div className="tactile-card paper-texture p-12 mb-8">
          <h1 className="text-5xl md:text-6xl font-headline font-bold text-charcoal mb-6 leading-tight">
            Tactile Digital
            <span className="block text-terracotta">Design System</span>
          </h1>
          <p className="text-xl text-charcoal/80 font-body mb-8 max-w-2xl leading-relaxed">
            A design language that feels human and grounded, rejecting the cold, flat aesthetic 
            for something more tactile and warm. Experience the difference between digital and physical.
          </p>
          <div className="flex flex-wrap gap-4">
            <button className="tactile-button">
              Get Started
            </button>
            <button className="tactile-button-secondary">
              Learn More
            </button>
          </div>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="max-w-6xl mx-auto mb-16">
        <h2 className="text-3xl font-headline font-semibold text-charcoal mb-8 text-center">
          Design Principles
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="tactile-card paper-texture p-8">
            <div className="w-16 h-16 bg-terracotta/20 rounded-squircle-sm mb-6 flex items-center justify-center">
              <svg className="w-8 h-8 text-terracotta" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <h3 className="text-xl font-headline font-semibold text-charcoal mb-4">
              Organic Shapes
            </h3>
            <p className="text-charcoal/70 font-body leading-relaxed">
              Custom squircle borders and asymmetric shapes that feel more natural 
              than perfect geometric forms.
            </p>
          </div>

          <div className="tactile-card paper-texture p-8">
            <div className="w-16 h-16 bg-sage/20 rounded-squircle-alt mb-6 flex items-center justify-center">
              <svg className="w-8 h-8 text-sage" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </div>
            <h3 className="text-xl font-headline font-semibold text-charcoal mb-4">
              Layered Depth
            </h3>
            <p className="text-charcoal/70 font-body leading-relaxed">
              Multi-directional shadows and subtle textures create the illusion 
              of physical paper and depth.
            </p>
          </div>

          <div className="tactile-card paper-texture p-8">
            <div className="w-16 h-16 bg-charcoal/10 rounded-squircle mb-6 flex items-center justify-center">
              <svg className="w-8 h-8 text-charcoal" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 7V3.5L18.5 9H13z"/>
              </svg>
            </div>
            <h3 className="text-xl font-headline font-semibold text-charcoal mb-4">
              Warm Typography
            </h3>
            <p className="text-charcoal/70 font-body leading-relaxed">
              Elegant serif headlines paired with clean sans-serif body text 
              for both personality and readability.
            </p>
          </div>
        </div>
      </section>

      {/* Interactive Elements */}
      <section className="max-w-4xl mx-auto mb-16">
        <div className="tactile-card paper-texture p-8">
          <h2 className="text-2xl font-headline font-semibold text-charcoal mb-6">
            Interactive Elements
          </h2>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-body font-medium text-charcoal mb-2">
                Your Name
              </label>
              <input 
                type="text" 
                placeholder="Enter your name..."
                className="tactile-input w-full max-w-md"
              />
            </div>
            <div>
              <label className="block text-sm font-body font-medium text-charcoal mb-2">
                Message
              </label>
              <textarea 
                placeholder="Tell us what you think..."
                className="tactile-input w-full h-32 resize-none"
              />
            </div>
            <div className="flex gap-4">
              <button className="tactile-button">
                Send Message
              </button>
              <button className="tactile-button-secondary">
                Save Draft
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Color Palette Display */}
      <section className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-headline font-semibold text-charcoal mb-6 text-center">
          Color Palette
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="tactile-card p-6 text-center">
            <div className="w-full h-20 bg-parchment rounded-squircle-sm mb-4 border-2 border-charcoal/10"></div>
            <h3 className="font-headline font-medium text-charcoal mb-1">Parchment</h3>
            <p className="text-sm text-charcoal/60 font-body">#F8F5EE</p>
          </div>
          <div className="tactile-card p-6 text-center">
            <div className="w-full h-20 bg-charcoal rounded-squircle-sm mb-4"></div>
            <h3 className="font-headline font-medium text-charcoal mb-1">Charcoal</h3>
            <p className="text-sm text-charcoal/60 font-body">#2B2A2D</p>
          </div>
          <div className="tactile-card p-6 text-center">
            <div className="w-full h-20 bg-terracotta rounded-squircle-sm mb-4"></div>
            <h3 className="font-headline font-medium text-charcoal mb-1">Terracotta</h3>
            <p className="text-sm text-charcoal/60 font-body">#D98666</p>
          </div>
          <div className="tactile-card p-6 text-center">
            <div className="w-full h-20 bg-sage rounded-squircle-sm mb-4"></div>
            <h3 className="font-headline font-medium text-charcoal mb-1">Sage</h3>
            <p className="text-sm text-charcoal/60 font-body">#88A89A</p>
          </div>
        </div>
      </section>
    </div>
  );
}
