<script setup>
/* ======================================
   页面功能：网站顶部导航栏（Header）
   功能概述：
   - 监听用户登录状态（Firebase Auth）
   - 显示用户名或邮箱
   - 判断是否为管理员
   - 控制不同角色显示不同导航项
   - 提供登出功能
====================================== */

import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import auth from '@/services/auth'
import { db } from '@/firebase/init'
import { doc, getDoc } from 'firebase/firestore'

/* 路由实例 */
const router = useRouter()

/* 当前用户显示名（用户名或邮箱） */
const displayName = ref('')

/* 是否为管理员 */
const isAdmin = ref(false)

/* 保存监听器的取消函数 */
let stop

/* 页面挂载时：监听登录状态 */
onMounted(() => {
  stop = auth.onAuthStateChanged(async (u) => {
    // 用户未登录
    if (!u) {
      displayName.value = ''
      isAdmin.value = false
      return
    }

    // 用户已登录，尝试读取 Firestore 中的用户名
    try {
      const snap = await getDoc(doc(db, 'users', u.uid))
      const uname = snap.exists() ? snap.data()?.username : ''
      displayName.value = uname || u.email || ''
    } catch {
      displayName.value = u.email || ''
    }

    // 获取当前用户角色
    const role = await auth.getCurrentUserRole()
    isAdmin.value = role === 'admin'
  })
})

/* 页面卸载时：移除监听器 */
onBeforeUnmount(() => {
  if (typeof stop === 'function') stop()
})

/* 登出函数：退出登录并跳转登录页 */
async function logout() {
  await auth.signOut()
  router.push('/login')
}
</script>

<template>
  <!-- 顶部导航栏整体结构 -->
  <header class="site-header border-bottom">
    <div class="container-nav">
      <!-- 主导航链接区域 -->
      <nav class="primary-nav" aria-label="Primary navigation">
        <RouterLink class="nav-link" to="/">Home</RouterLink>
        <RouterLink class="nav-link" to="/programs">Programs</RouterLink>
        <RouterLink class="nav-link" to="/quiz">Self-check Quiz</RouterLink>
        <RouterLink class="nav-link" to="/tracker">Habit Tracker</RouterLink>
        <RouterLink class="nav-link" to="/learn">Learn</RouterLink>
        <RouterLink class="nav-link" to="/map">Healthy Map</RouterLink>

        <!-- 管理员专属链接 -->
        <RouterLink v-if="isAdmin" class="nav-link" to="/emailmanagement"
          >Email Management</RouterLink
        >
        <RouterLink v-if="isAdmin" class="nav-link" to="/admin">Dashboard</RouterLink>
        <RouterLink v-if="isAdmin" class="nav-link" to="/analytics">Analytics</RouterLink>
      </nav>

      <!-- 账户区域 -->
      <div class="account-zone" role="group" aria-label="Account">
        <!-- 已登录显示用户名与登出 -->
        <template v-if="displayName">
          <span class="welcome">Welcome, {{ displayName }}</span>
          <a href="#" class="logout" @click.prevent="logout" aria-label="Logout">Logout</a>
        </template>

        <!-- 未登录显示登录按钮 -->
        <RouterLink v-else class="btn-login" to="/login" aria-label="Login">Login</RouterLink>
      </div>
    </div>
  </header>
</template>

<style scoped>
/* 顶部容器布局 */
.container-nav {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 12px;
}

/* 主导航样式 */
.primary-nav {
  flex: 1 1 auto;
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  align-items: center;
}

/* 导航链接样式 */
.nav-link {
  text-decoration: none;
  color: #0a2a5e;
  font-weight: 500;
}
.nav-link:hover {
  color: #081f44;
}

/* 当前路由高亮样式 */
.router-link-active {
  color: #0a58ca;
  border-bottom: 2px solid #0a58ca;
}

/* 账户区域布局 */
.account-zone {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
}

/* 欢迎文字样式 */
.welcome {
  color: #495057;
}

/* 登出按钮样式 */
.logout {
  color: #0a58ca;
  text-decoration: none;
  border-bottom: 1px dotted transparent;
}
.logout:hover {
  border-bottom-color: #0a58ca;
}

/* 登录按钮样式 */
.btn-login {
  padding: 4px 10px;
  border: 1px solid #0a58ca;
  border-radius: 6px;
  text-decoration: none;
  color: #0a58ca;
}
.btn-login:hover {
  background: #d7eef6;
}

/* 顶部栏背景色 */
.site-header {
  background: #d7eef6;
}
</style>
