export interface Note {
  id: number
  title: string
  content: string
  isBookmarked: boolean
  createdAt: string
  updatedAt: string
  userId: number
  serverId?: number
  baseHash?: string
}