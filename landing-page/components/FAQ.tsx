import { Minus, Plus } from "lucide-react";
import { useState } from "react";

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      question: "What is curate.fun?",
      answer:
        "curate.fun is a platform designed to streamline community crowsourced news to build autonomous content.",
    },
    {
      question: "How do I get a feed?",
      answer: "Hop on our telegram and let us know what you want.",
    },
    {
      question: "Wen token?",
      answer: "Soon. TG for alpha",
    },
    {
      question: "What is platforms are currently supported?",
      answer:
        "Currently twitter for curation, headlines + threads + blogs for content, and telegram + twitter crosspost. Will be adding more soon.",
    },
    {
      question: "How can you add support?",
      answer:
        "You can add support by contributing to our <a class='hyperlink' href='https://github.com/potlock/curatedotfun' target='_blank' rel='noopener noreferrer'>GitHub repository</a> or joining our community.",
    },
    {
      question: "How does it work?",
      answer:
        "curate.fun uses AI to summarize content from the approved community curated news from socials.",
    },
  ];

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="w-full bg-white mb-20">
      <div className="w-full flex md:flex-row flex-col mx-auto py-6 md:py-8">
        <div className="max-w-[1200px] mx-auto px-4">
          <div className="flex flex-col md:items-start items-center mb-6 md:mb-8">
            <span className="inline-block px-4 py-2 rounded-full border border-black text-sm">
              FAQs
            </span>
          </div>

          <h2 className="text-3xl md:text-5xl font-bold mb-8 md:mb-12 text-center md:text-left">
            Frequently asked questions
          </h2>
          <p className="md:text-left text-center mb-8">
            CONTACT US <span className="text-blue-500">→</span>
          </p>
        </div>
        <div className="md:max-w-[820px] max-w-[1200px] flex-1 w-full mx-auto px-6">
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="p-4 bg-gray-100 rounded-md">
                <div
                  className="flex justify-between items-center flex-1 cursor-pointer"
                  onClick={() => toggleFAQ(index)}
                >
                  <p className="font-semibold">{faq.question}</p>
                  <div className="flex items-center">
                    {openIndex === index ? (
                      <Minus
                        className="text-gray-500 cursor-pointer"
                        onClick={() => toggleFAQ(index)}
                      />
                    ) : (
                      <Plus
                        className="text-gray-500 cursor-pointer"
                        onClick={() => toggleFAQ(index)}
                      />
                    )}
                  </div>
                </div>
                {openIndex === index && (
                  <p
                    className="mt-2 text-gray-600 flex-1"
                    dangerouslySetInnerHTML={{ __html: faq.answer }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
