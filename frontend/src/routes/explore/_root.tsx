import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/explore/_root')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/explore/_root"!</div>
}
