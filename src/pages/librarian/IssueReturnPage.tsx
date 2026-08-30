import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { IssueBookTab } from './issue-return/IssueBookTab'
import { ReturnBookTab } from './issue-return/ReturnBookTab'

export default function IssueReturnPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Issue / Return</h1>
        <p className="text-sm text-muted-foreground">Issue books to students or process returns.</p>
      </div>

      <Tabs defaultValue="issue">
        <TabsList>
          <TabsTrigger value="issue">Issue Book</TabsTrigger>
          <TabsTrigger value="return">Return Book</TabsTrigger>
        </TabsList>
        <TabsContent value="issue">
          <IssueBookTab />
        </TabsContent>
        <TabsContent value="return">
          <ReturnBookTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
