import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Check, CheckCheck, Trash2, X, Upload, AlertTriangle, Info, AlertCircle, ShieldCheck } from 'lucide-react'
import { clsx } from 'clsx'
import { useAuth } from '../../contexts/AuthContext'
import {
    getNotifications,
    getUnreadNotificationCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    clearAllNotifications
} from '../../lib/supabase'
import type { Notification, NotificationType } from '../../lib/types'
import Spinner from '../ui/Spinner'

const notificationIcons: Record<NotificationType, React.ElementType> = {
    info: Info,
    success: CheckCheck,
    warning: AlertTriangle,
    error: AlertCircle,
    upload: Upload,
    security: ShieldCheck,
}

const notificationColors: Record<NotificationType, string> = {
    info: 'bg-blue-500/20 text-blue-400',
    success: 'bg-emerald-500/20 text-emerald-400',
    warning: 'bg-amber-500/20 text-amber-400',
    error: 'bg-red-500/20 text-red-400',
    upload: 'bg-purple-500/20 text-purple-400',
    security: 'bg-cyan-500/20 text-cyan-400',
}

function formatTimeAgo(dateString: string): string {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()

    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Agora mesmo'
    if (minutes < 60) return `Há ${minutes} min`
    if (hours < 24) return `Há ${hours}h`
    if (days < 7) return `Há ${days}d`
    return date.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })
}

export default function NotificationsDropdown() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [isOpen, setIsOpen] = useState(false)
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [loading, setLoading] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    // Fetch notifications on mount and periodically
    useEffect(() => {
        if (user) {
            loadNotifications()
            loadUnreadCount()

            // Poll for new notifications every 30 seconds
            const interval = setInterval(() => {
                loadUnreadCount()
            }, 30000)

            return () => clearInterval(interval)
        }
    }, [user])

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const loadNotifications = async () => {
        if (!user) return
        setLoading(true)
        try {
            const data = await getNotifications(user.id)
            setNotifications(data)
        } catch (err) {
            console.error('Error loading notifications:', err)
        } finally {
            setLoading(false)
        }
    }

    const loadUnreadCount = async () => {
        if (!user) return
        try {
            const count = await getUnreadNotificationCount(user.id)
            setUnreadCount(count)
        } catch (err) {
            console.error('Error loading unread count:', err)
        }
    }

    const handleToggle = () => {
        setIsOpen(!isOpen)
        if (!isOpen) {
            loadNotifications()
        }
    }

    const handleMarkAsRead = async (notification: Notification) => {
        if (notification.read) return

        try {
            await markNotificationAsRead(notification.id)
            setNotifications(prev =>
                prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
            )
            setUnreadCount(prev => Math.max(0, prev - 1))
        } catch (err) {
            console.error('Error marking as read:', err)
        }
    }

    const handleMarkAllAsRead = async () => {
        if (!user) return

        try {
            await markAllNotificationsAsRead(user.id)
            setNotifications(prev => prev.map(n => ({ ...n, read: true })))
            setUnreadCount(0)
        } catch (err) {
            console.error('Error marking all as read:', err)
        }
    }

    const handleDelete = async (notificationId: string, e: React.MouseEvent) => {
        e.stopPropagation()

        try {
            await deleteNotification(notificationId)
            const deleted = notifications.find(n => n.id === notificationId)
            if (deleted && !deleted.read) {
                setUnreadCount(prev => Math.max(0, prev - 1))
            }
            setNotifications(prev => prev.filter(n => n.id !== notificationId))
        } catch (err) {
            console.error('Error deleting notification:', err)
        }
    }

    const handleClearAll = async () => {
        if (!user) return

        try {
            await clearAllNotifications(user.id)
            setNotifications([])
            setUnreadCount(0)
        } catch (err) {
            console.error('Error clearing notifications:', err)
        }
    }

    const handleNotificationClick = (notification: Notification) => {
        handleMarkAsRead(notification)
        if (notification.action_url) {
            navigate(notification.action_url)
            setIsOpen(false)
        }
    }

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                onClick={handleToggle}
                className={clsx(
                    'relative p-2 rounded-lg transition-colors',
                    isOpen
                        ? 'bg-gray-700 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                )}
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-96 bg-gray-900/95 backdrop-blur-xl border border-gray-800 rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
                        <h3 className="font-semibold text-white">Notificações</h3>
                        <div className="flex items-center gap-2">
                            {unreadCount > 0 && (
                                <button
                                    onClick={handleMarkAllAsRead}
                                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                                    title="Marcar todas como lidas"
                                >
                                    <Check className="w-3 h-3" />
                                    Marcar todas
                                </button>
                            )}
                            {notifications.length > 0 && (
                                <button
                                    onClick={handleClearAll}
                                    className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                                    title="Limpar todas"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Notifications List */}
                    <div className="max-h-96 overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <Spinner size="md" />
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                                <Bell className="w-12 h-12 mb-2 opacity-50" />
                                <p className="text-sm">Sem notificações</p>
                            </div>
                        ) : (
                            notifications.map((notification) => {
                                const Icon = notificationIcons[notification.type] || Info
                                const colorClass = notificationColors[notification.type] || notificationColors.info

                                return (
                                    <div
                                        key={notification.id}
                                        onClick={() => handleNotificationClick(notification)}
                                        className={clsx(
                                            'flex items-start gap-3 px-4 py-3 border-b border-gray-800/50 cursor-pointer transition-colors',
                                            !notification.read
                                                ? 'bg-blue-500/5 hover:bg-blue-500/10'
                                                : 'hover:bg-gray-800/50'
                                        )}
                                    >
                                        <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', colorClass)}>
                                            <Icon className="w-5 h-5" />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className={clsx(
                                                    'text-sm font-medium truncate',
                                                    !notification.read ? 'text-white' : 'text-gray-300'
                                                )}>
                                                    {notification.title}
                                                </p>
                                                <button
                                                    onClick={(e) => handleDelete(notification.id, e)}
                                                    className="text-gray-500 hover:text-red-400 transition-colors flex-shrink-0"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">
                                                {notification.message}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {formatTimeAgo(notification.created_at)}
                                            </p>
                                        </div>

                                        {!notification.read && (
                                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
                                        )}
                                    </div>
                                )
                            })
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <div className="px-4 py-2 border-t border-gray-800">
                            <button
                                onClick={() => {
                                    navigate('/settings')
                                    setIsOpen(false)
                                }}
                                className="text-xs text-gray-400 hover:text-white transition-colors"
                            >
                                Gerir preferências de notificações →
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
