// common/tasks.js
// This file defines the configuration for tasks, shared between client and server.

export const TASKS_CONFIG = [
    { id: 'morning-video', label: '早间视频', types: 'video/*', size: '2GB' },
    { id: 'evening-video', label: '晚间视频', types: 'video/*', size: '2GB' },
    {
        id: 'english-task',
        label: '英语任务',
        subTasks: [
            { id: 'english-task-doc', label: '英语题目', types: 'image/*,application/pdf', size: '10MB' },
            { id: 'english-task-video', label: '英语讲解视频', types: 'video/*', size: '2GB' }
        ]
    },
    {
        id: 'math-task',
        label: '数学任务',
        subTasks: [
            { id: 'math-task-doc', label: '数学题目', types: 'image/*,application/pdf', size: '10MB' },
            { id: 'math-task-video', label: '数学讲解视频', types: 'video/*', size: '2GB' }
        ]
    },
    {
        id: 'physics-task',
        label: '物理任务',
        subTasks: [
            { id: 'physics-task-doc', label: '物理题目', types: 'image/*,application/pdf', size: '10MB' },
            { id: 'physics-task-video', label: '物理讲解视频', types: 'video/*', size: '2GB' }
        ]
    },
];