/// <reference types="vite/client" />

declare module '@mui/icons-material/*' {
  import type { SvgIconProps } from '@mui/material/SvgIcon'
  const content: React.FC<SvgIconProps>
  export default content
}

declare module '*.svg' {
  import type { FC, SVGProps } from 'react'
  const content: FC<SVGProps<SVGElement>>
  export default content
}

declare module '*.png' {
  const content: string
  export default content
}

declare module '*.jpg' {
  const content: string
  export default content
}
