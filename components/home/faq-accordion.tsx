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
            className={cn("w-full space-y-3", className)}
        >
            {faqs.map((faq, index) => (
                <AccordionItem
                    key={index}
                    value={`item-${index}`}
                    className="border rounded-2xl bg-white/90 border-stone-200/80 data-[state=open]:border-[#2E5650]/40 data-[state=open]:shadow-md data-[state=open]:shadow-[#2E5650]/5 hover:border-stone-300 transition-all duration-200 overflow-hidden"
                >
                    <AccordionTrigger className="text-left font-bold text-sm sm:text-base hover:no-underline px-5 py-4 text-[#281E19] data-[state=open]:text-[#2E5650] [&[data-state=open]>svg]:text-[#2E5650] [&[data-state=open]>svg]:rotate-180 [&>svg]:transition-transform [&>svg]:duration-200">
                        {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="px-5 pb-5 pt-0 text-[#382821]/75 leading-relaxed text-sm">
                        {faq.answer}
                    </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
    )
}


