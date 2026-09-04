import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        tempo: {
          ink: '#263834',
          muted: '#6f7c77',
          cream: '#f8f4ed',
          panel: '#fffdf9',
          sage: '#2f7d69',
          sageSoft: '#e5efe9',
          coral: '#e86f63',
          coralSoft: '#fbe8e5',
          amber: '#d89b2b',
          amberSoft: '#fbefcf',
          line: '#e5e2da'
        }
      },
      boxShadow: {
        soft: '0 10px 30px rgba(38, 56, 52, 0.08)',
        card: '0 4px 16px rgba(38, 56, 52, 0.07)'
      }
    }
  },
  plugins: []
}
export default config
