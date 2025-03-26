import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/profile/_root')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/profile/_root"!</div>
}
