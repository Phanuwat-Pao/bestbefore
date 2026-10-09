import { createFileRoute } from "@tanstack/react-router";

import { Page } from "@/components/page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/help")({ component: HelpPage });

function HelpPage() {
  const { t } = useI18n();
  const commands: { cmd: string; what: string }[] = [
    { cmd: "@BestBefore / รายการ", what: t.helpCmdList },
    { cmd: "ใกล้หมด", what: t.helpCmdSoon },
    { cmd: "หมดแล้ว", what: t.helpCmdExpired },
    { cmd: "ประวัติ", what: t.helpCmdHistory },
    { cmd: "ช่วย", what: t.helpCmdHelp },
  ];
  return (
    <Page title={t.helpTitle}>
      <Card>
        <CardHeader>
          <CardTitle>{t.helpAddTitle}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <p>{t.helpAddBody}</p>
          <p className="text-muted-foreground">{t.helpAddDate}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t.helpGroupTitle}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <p>{t.helpGroupBody}</p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2">
            {commands.map((c) => (
              <div key={c.cmd} className="contents">
                <dt>
                  <code className="bg-muted rounded px-1.5 py-0.5 text-xs">
                    {c.cmd}
                  </code>
                </dt>
                <dd className="text-muted-foreground">{c.what}</dd>
              </div>
            ))}
          </dl>
          <p className="text-muted-foreground">{t.helpGroupNote}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t.helpDmTitle}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">{t.helpDmBody}</CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t.helpPushTitle}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">{t.helpPushBody}</CardContent>
      </Card>
    </Page>
  );
}
