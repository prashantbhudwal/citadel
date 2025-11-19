import { BookCover } from '@/routes/dw/books/-components'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="flex flex-col ">
      {[1, 2, 3].map((item) => (
        <BookCover
          title="The Black Swan"
          coverImage="abc.png"
          key={item}
          link="ashant.in"
        />
      ))}
    </div>
  )
}
