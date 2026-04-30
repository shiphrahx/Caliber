export default function DashboardLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="h-8 w-8 rounded-full border-2 border-t-transparent animate-spin"
           style={{ borderColor: 'rgb(0,255,229)', borderTopColor: 'transparent' }} />
    </div>
  )
}
