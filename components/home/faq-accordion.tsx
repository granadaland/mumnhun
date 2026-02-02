import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import { cn } from "@/lib/utils"

interface FaqItem {
    question: string
    answer: string
}

interface FaqAccordionProps {
    faqs: FaqItem[]
    className?: string
}

export function FaqAccordion({ faqs, className }: FaqAccordionProps) {
    return (
        <Accordion
            type="single"
            collapsible
            className={cn("w-full space-y-4", className)}
        >
            {faqs.map((faq, index) => (
                <AccordionItem
                    key={index}
                    value={`item-${index}`}
                    className="border rounded-2xl bg-white/50 backdrop-blur-sm border-white/60 data-[state=open]:border-[#466A68]/50 data-[state=open]:shadow-lg data-[state=open]:shadow-[#466A68]/5 hover:border-[#466A68]/30 transition-all duration-300 overflow-hidden"
                >
                    <AccordionTrigger className="text-left font-semibold hover:no-underline px-5 py-4 text-[#382821] data-[state=open]:text-[#466A68] [&[data-state=open]>svg]:text-white [&[data-state=open]>svg]:bg-[#466A68] [&>svg]:p-1 [&>svg]:rounded-full [&>svg]:bg-gray-100 [&>svg]:text-gray-500 [&>svg]:transition-all">
                        {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="px-5 pb-5 pt-0 text-[#382821]/70 leading-relaxed">
                        {faq.answer}
                    </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
    )
}

