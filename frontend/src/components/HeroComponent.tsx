import { Button } from "./ui/button";

interface ButtonProps {
  text: string;
  link: string;
  variant?: "primary" | "secondary";
}

interface HeroComponentProps {
  title: string;
  description: string;
  buttons?: ButtonProps[];
  //   descriptionWithBreak?: boolean;
}

export default function HeroComponent({
  title,
  description,
  buttons,
}: HeroComponentProps) {
  return (
    <div
      className="flex flex-col items-center justify-center py-20 gap-2 border w-full"
      style={{
        backgroundImage: 'url("/grid.png")',
        backgroundRepeat: "repeat",
        backgroundSize: "auto",
        backgroundPosition: "center",
      }}
    >
      <h1 className="md:text-5xl text-2xl text-center font-bold">{title}</h1>
      <p className=" md:text-2xl text-lg text-center px-2 font-normal leading-8">
        {description}
      </p>

      {buttons && buttons.length > 0 && (
        <div className="flex gap-3 mt-4">
          {buttons.map((button, index) => (
            <a href={button.link} key={index}>
              <Button
                variant={
                  button.variant === "primary"
                    ? "filled"
                    : button.variant === "secondary"
                      ? "secondary"
                      : "default"
                }
              >
                {button.text}
              </Button>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
