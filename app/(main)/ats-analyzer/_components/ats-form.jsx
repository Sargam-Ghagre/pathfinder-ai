"use client";

import { useState, useTransition } from "react";
import { analyzeATS } from "@/actions/ats";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, ScanText, FileText, Briefcase, Sparkles, ClipboardPaste } from "lucide-react";

export default function ATSForm({ savedResumeContent, onComplete }) {
  const [resumeContent, setResumeContent] = useState(savedResumeContent || "");
  const [jobDescription, setJobDescription] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!resumeContent.trim()) {
      toast.error("Please paste your resume content.");
      return;
    }
    if (!jobDescription.trim()) {
      toast.error("Please paste the job description.");
      return;
    }

    startTransition(async () => {
      try {
        const result = await analyzeATS({
          resumeContent,
          jobDescription,
          jobTitle,
          companyName,
        });
        toast.success("ATS analysis complete!");
        onComplete(result);
      } catch (err) {
        console.error(err);
        toast.error(err.message || "Analysis failed. Please try again.");
      }
    });
  };

  const handlePreFill = () => {
    if (savedResumeContent) {
      setResumeContent(savedResumeContent);
      toast.success("Resume pre-filled from your saved resume.");
    } else {
      toast.info("No saved resume found. Build one in the Resume section first.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Job meta row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-dashed">
          <CardContent className="pt-4 pb-4">
            <div className="space-y-2">
              <Label htmlFor="jobTitle" className="flex items-center gap-2 text-sm font-medium">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                Job Title <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="jobTitle"
                placeholder="e.g. Senior Software Engineer"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                disabled={isPending}
              />
            </div>
          </CardContent>
        </Card>
        <Card className="border-dashed">
          <CardContent className="pt-4 pb-4">
            <div className="space-y-2">
              <Label htmlFor="companyName" className="flex items-center gap-2 text-sm font-medium">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                Company Name <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="companyName"
                placeholder="e.g. Google"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                disabled={isPending}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main input panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Resume panel */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-5 w-5 text-blue-500" />
              Your Resume
            </CardTitle>
            <CardDescription>
              Paste your resume text below. Plain text or Markdown works best.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-3">
            {savedResumeContent && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="self-start flex items-center gap-2 text-xs"
                onClick={handlePreFill}
                disabled={isPending}
              >
                <ClipboardPaste className="h-3.5 w-3.5" />
                Use My Saved Resume
              </Button>
            )}
            <Textarea
              id="resumeContent"
              placeholder="Paste your resume content here...&#10;&#10;Include: Work Experience, Skills, Education, Projects, Certifications."
              value={resumeContent}
              onChange={(e) => setResumeContent(e.target.value)}
              className="flex-1 min-h-[380px] resize-none font-mono text-sm leading-relaxed"
              disabled={isPending}
              required
            />
            <p className="text-xs text-muted-foreground">
              {resumeContent.trim().split(/\s+/).filter(Boolean).length} words
            </p>
          </CardContent>
        </Card>

        {/* Job description panel */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Briefcase className="h-5 w-5 text-violet-500" />
              Job Description
            </CardTitle>
            <CardDescription>
              Paste the full job description — the more detail, the better the analysis.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-3">
            <Textarea
              id="jobDescription"
              placeholder="Paste the job description here...&#10;&#10;Include: Responsibilities, Requirements, Nice-to-haves, Tech stack."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              className="flex-1 min-h-[380px] resize-none font-mono text-sm leading-relaxed"
              disabled={isPending}
              required
            />
            <p className="text-xs text-muted-foreground">
              {jobDescription.trim().split(/\s+/).filter(Boolean).length} words
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Submit */}
      <div className="flex justify-center pt-2">
        <Button
          type="submit"
          size="lg"
          disabled={isPending}
          className="min-w-[220px] h-12 text-base font-semibold flex items-center gap-2"
        >
          {isPending ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Analyzing with AI…
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5" />
              Analyze My Resume
            </>
          )}
        </Button>
      </div>

      {isPending && (
        <p className="text-center text-sm text-muted-foreground animate-pulse">
          Gemini AI is scoring your resume — this takes ~10 seconds…
        </p>
      )}
    </form>
  );
}
