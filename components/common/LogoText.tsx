import { cn } from "@/lib/utils";

interface LogoTextProps {
    className?: string;
}
export default function LogoText({ className }: LogoTextProps) {
    return (
        <h2 className={cn("text-3xl font-medium font-[font--eb-garamond]", className)}>Rely</h2>
    )
}