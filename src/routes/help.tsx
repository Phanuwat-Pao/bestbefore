import { createFileRoute } from "@tanstack/react-router";

import { Page } from "@/components/page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/help")({ component: HelpPage });

const COMMANDS: { cmd: string; what: string }[] = [
  { cmd: "@BestBefore หรือ รายการ", what: "ของทั้งหมด เรียงใกล้หมดอายุก่อน" },
  { cmd: "ใกล้หมด", what: "ของที่ใกล้หมดอายุ" },
  { cmd: "หมดแล้ว", what: "ของที่หมดอายุแล้ว" },
  { cmd: "ประวัติ", what: "ของที่ใช้แล้ว" },
  { cmd: "ช่วย", what: "รายการคำสั่ง" },
];

function HelpPage() {
  return (
    <Page title="วิธีใช้">
      <Card>
        <CardHeader>
          <CardTitle>เพิ่มของ</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <p>
            กด <strong>เพิ่ม</strong> แล้วถ่ายรูปด้านหน้าสินค้าและวันหมดอายุ
            ระบบจะอ่านชื่อและวันที่ให้ ตรวจสอบแล้วกดบันทึก ถ้าอ่านไม่ได้ก็กรอกเองได้
          </p>
          <p className="text-muted-foreground">
            วันที่บนฉลากไทยมักเป็น วัน/เดือน/ปี พ.ศ. เช่น 15/10/69 คือ 15 ต.ค. 2569
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>ในกลุ่ม LINE</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <p>แท็กบอทในกลุ่มแล้วพิมพ์คำสั่ง</p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2">
            {COMMANDS.map((c) => (
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
          <p className="text-muted-foreground">
            ในรายการมีปุ่ม ใช้แล้ว แก้ไข และ ลบ ให้กดได้เลย ถ้ามีของใกล้หมดอายุ
            บอทจะตอบเตือนต่อท้ายข้อความในกลุ่มวันละครั้ง
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>แชทส่วนตัวกับบอท</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          พิมพ์คำสั่งเดียวกันได้โดยไม่ต้องแท็ก และมีปุ่มเพิ่มของในเมนูด้านล่าง
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>การแจ้งเตือน</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          เปิดการแจ้งเตือนในหน้าตั้งค่า จะได้สรุปของใกล้หมดอายุทุกเช้า บน iPhone ต้องเปิดเว็บนี้ใน
          Safari แล้วเพิ่มไปยังหน้าจอโฮมก่อน
        </CardContent>
      </Card>
    </Page>
  );
}
