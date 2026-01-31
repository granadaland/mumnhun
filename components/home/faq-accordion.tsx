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
            className={cn("w-full", className)}
        >
            {faqs.map((faq, index) => (
                <AccordionItem
                    key={index}
                    value={`item-${index}`}
                    className="border-b border-cream-200"
                >
                    <AccordionTrigger className="text-left font-medium hover:text-teal-600 hover:no-underline py-4">
                        {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground pb-4">
                        {faq.answer}
                    </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
    )
}
