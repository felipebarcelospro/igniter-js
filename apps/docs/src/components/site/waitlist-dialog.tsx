"use client";
import React from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent as DialogContentPrimitive,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useMediaQuery } from "@/hooks/use-media-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
});

export function WaitlistDialog({ children }: { children: React.ReactNode }) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  const [isSubmitted, setIsSubmitted] = React.useState(false);
  const isMobile = useMediaQuery("(max-width: 640px)");

  async function onSubmit(values: z.infer<typeof formSchema>) {
    await fetch("https://api.useplunk.com/v1/track", {
      method: "POST",
      body: JSON.stringify({
        event: "STCFC_waitlist_signup",
        email: values.email,
        source: "STCFC_waitlist",
        userAgent: navigator.userAgent,
      }),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_PLUNK_API_KEY}`,
      },
    });

    setIsSubmitted(true);
  }

  const DialogContent = (
    <div className="relative p-4">
      <DialogHeader className="space-y-2 mb-4 text-left">
        <DialogTitle className="text-2xl font-semibold tracking-tight">
          {!isSubmitted && (
            <span className="flex items-center space-x-2 animate-fade-in">
              <svg
                className="w-6 h-6 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                ></path>
              </svg>
              <span>Join the Waitlist</span>
            </span>
          )}
        </DialogTitle>
        <DialogDescription className="text-sm text-muted-foreground">
          {!isSubmitted &&
            "Be the first to know when our Chrome extension is ready. Enter your email to join the waitlist."}
        </DialogDescription>
      </DialogHeader>
      {!isSubmitted ? (
        <div className="space-y-4">
          <div className="border rounded-xl">
            <div className="bg-secondary/20 rounded-xl border-b rounded-b-none p-4">
              <div className="flex items-center space-x-4">
                <div className="bg-primary/10 p-3 rounded-full">
                  <svg
                    className="w-4 h-4 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    ></path>
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Sign Up</h3>
                  <p className="text-sm text-muted-foreground">
                    Enter your email to join our exclusive waitlist
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-secondary/20 p-4 border-b">
              <div className="flex items-center space-x-4">
                <div className="bg-primary/10 p-3 rounded-full">
                  <svg
                    className="w-4 h-4 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    ></path>
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Confirm</h3>
                  <p className="text-sm text-muted-foreground">
                    Verify your email to secure your spot
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-secondary/20 rounded-xl rounded-t-none p-4">
              <div className="flex items-center space-x-4">
                <div className="bg-primary/10 p-3 rounded-full">
                  <svg
                    className="w-4 h-4 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    ></path>
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Wait for Beta</h3>
                  <p className="text-sm text-muted-foreground">
                    We&apos;ll notify you when the beta is ready
                  </p>
                </div>
              </div>
            </div>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        placeholder="Enter your email"
                        {...field}
                        className="h-10 text-sm bg-muted border-input focus:ring-2 focus:ring-ring transition-all duration-300"
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full h-10 text-sm bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-all duration-300"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting && (
                  <svg
                    className="w-5 h-5 mr-2 animate-spin"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 8V16M8 12H16"
                    ></path>
                  </svg>
                )}
                Join Waitlist
              </Button>
            </form>
          </Form>
        </div>
      ) : (
        <div className="py-6 text-center animate-fade-in-up">
          <svg
            className="w-20 h-20 mx-auto text-primary mb-6 animate-bounce"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            ></path>
          </svg>
          <h3 className="text-2xl font-bold text-foreground mb-2">
            Welcome aboard!
          </h3>
          <p className="text-lg text-muted-foreground mb-6">
            We&apos;re thrilled to have you join our waitlist. Exciting updates
            are coming your way soon!
          </p>
          <div className="space-y-4">
            <p className="text-sm font-medium text-foreground">
              Help spread the word:
            </p>
            <div className="flex flex-col space-y-4">
              <Button
                variant="outline"
                size="lg"
                className="flex items-center h-12 w-full justify-center"
                asChild
              >
                <a
                  href={`https://x.com/intent/tweet?text=${encodeURIComponent("I just joined the waitlist for Shadcn/UI Theme Creator for Chrome! Can't wait to try it out. #WebDev #UIDesign")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mr-2"
                  >
                    <path d="M4 4l11.733 16h4.267l-11.733 -16z"></path>
                    <path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772"></path>
                  </svg>
                  Share on Twitter
                </a>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="flex items-center h-12 w-full justify-center"
                asChild
              >
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mr-2"
                  >
                    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
                    <rect x="2" y="9" width="4" height="12"></rect>
                    <circle cx="4" cy="4" r="2"></circle>
                  </svg>
                  Share on LinkedIn
                </a>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer>
        <DrawerTrigger asChild>{children}</DrawerTrigger>
        <DrawerContent>{DialogContent}</DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContentPrimitive className="sm:max-w-[500px] bg-background text-foreground rounded-lg overflow-hidden transition-all duration-300 ease-in-out">
        {DialogContent}
      </DialogContentPrimitive>
    </Dialog>
  );
}
