/* eslint-disable @typescript-eslint/no-non-null-assertion */

import * as React from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ARButton } from './webxr/ARButton'
import { VRButton } from './webxr/VRButton'
import { XRController } from './XRController'
import { Props as ContainerProps } from '@react-three/fiber/dist/declarations/src/web/Canvas'
import { InteractionManager, InteractionsContext } from './Interactions'
import {
  XRSessionInit,
  Group,
  Matrix4,
  XRFrame,
  XRHandedness,
  XRHitTestResult,
  XRHitTestSource,
  XRInputSourceChangeEvent,
  XRReferenceSpace
} from 'three'

export interface XRContextValue {
  controllers: XRController[]
  isPresenting: boolean
  player: Group
  isHandTracking: boolean
}
const XRContext = React.createContext<XRContextValue>({} as any)

const useControllers = (group: Group): XRController[] => {
  const { gl } = useThree()
  const [controllers, setControllers] = React.useState<XRController[]>([])

  React.useEffect(() => {
    const ids = [0, 1]
    ids.forEach((id) => {
      XRController.make(
        id,
        gl,
        (controller) => {
          group.add(controller.controller)
          group.add(controller.grip)
          group.add(controller.hand)
          setControllers((it) => [...it, controller])
        },
        (controller) => {
          group.remove(controller.controller)
          group.remove(controller.grip)
          group.remove(controller.hand)
          setControllers((existing) => existing.filter((it) => it !== controller))
        }
      )
    })
  }, [gl, group])

  return controllers
}

export function useHitTest(hitTestCallback: (hitMatrix: Matrix4, hit: XRHitTestResult) => void) {
  const { gl } = useThree()

  const hitTestSource = React.useRef<XRHitTestSource | undefined>()
  const hitTestSourceRequested = React.useRef(false)
  const [hitMatrix] = React.useState(() => new Matrix4())

  useFrame(() => {
    if (!gl.xr.isPresenting) return

    const session = gl.xr.getSession()
    if (!session) return

    if (!hitTestSourceRequested.current) {
      session.requestReferenceSpace('viewer').then((referenceSpace: XRReferenceSpace) => {
        session.requestHitTestSource({ space: referenceSpace }).then((source: XRHitTestSource) => {
          hitTestSource.current = source
        })
      })
      session.addEventListener(
        'end',
        () => {
          hitTestSourceRequested.current = false
          hitTestSource.current = undefined
        },
        { once: true }
      )
      hitTestSourceRequested.current = true
    }

    if (hitTestSource.current && gl.xr.isPresenting) {
      const referenceSpace = gl.xr.getReferenceSpace()

      if (referenceSpace) {
        // This raf is unnecesary, we should get XRFrame from r3f but it's not implemented yet
        session.requestAnimationFrame((time: DOMHighResTimeStamp, frame: XRFrame) => {
          const hitTestResults = frame.getHitTestResults(hitTestSource.current as XRHitTestSource)
          if (hitTestResults.length) {
            const hit = hitTestResults[0]
            const pose = hit.getPose(referenceSpace)

            if (pose) {
              hitMatrix.fromArray(pose.transform.matrix)
              hitTestCallback(hitMatrix, hit)
            }
          }
        })
      }
    }
  })
}

export function XR({ foveation = 0, children }: { foveation?: number; children: React.ReactNode }) {
  const { gl, camera } = useThree()
  const [isPresenting, setIsPresenting] = React.useState(() => gl.xr.isPresenting)
  const [isHandTracking, setHandTracking] = React.useState(false)
  const [player] = React.useState(() => new Group())
  const controllers = useControllers(player)

  React.useEffect(() => {
    const xr = gl.xr as any

    const handleSessionChange = () => setIsPresenting(xr.isPresenting)

    xr.addEventListener('sessionstart', handleSessionChange)
    xr.addEventListener('sessionend', handleSessionChange)

    return () => {
      xr.removeEventListener('sessionstart', handleSessionChange)
      xr.removeEventListener('sessionend', handleSessionChange)
    }
  }, [gl])

  React.useEffect(() => {
    const xr = gl.xr as any

    if (xr.setFoveation) {
      xr.setFoveation(foveation)
    }
  }, [gl, foveation])

  React.useEffect(() => {
    const session = gl.xr.getSession()

    const handleInputSourcesChange = (event: Event | XRInputSourceChangeEvent) =>
      setHandTracking(Object.values((event as XRInputSourceChangeEvent).session.inputSources).some((source) => source.hand))

    session?.addEventListener('inputsourceschange', handleInputSourcesChange)

    setHandTracking(Object.values(session?.inputSources ?? []).some((source) => source.hand))

    return () => {
      session?.removeEventListener('inputsourceschange', handleInputSourcesChange)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPresenting])

  const value = React.useMemo(
    () => ({ controllers, isPresenting, isHandTracking, player }),
    [controllers, isPresenting, isHandTracking, player]
  )

  return (
    <XRContext.Provider value={value}>
      <primitive object={player} dispose={null}>
        <primitive object={camera} dispose={null} />
      </primitive>
      {children}
    </XRContext.Provider>
  )
}

function XRCanvas({ foveation, children, ...rest }: ContainerProps & { foveation?: number }) {
  return (
    <Canvas vr {...rest}>
      <XR foveation={foveation}>
        <InteractionManager>{children}</InteractionManager>
      </XR>
    </Canvas>
  )
}

const createXRButton = (mode: 'AR' | 'VR', gl: any, sessionInit?: any) => {
  const button = mode === 'AR' ? ARButton : VRButton
  const button2 = VRButton

  const selector = mode === 'AR' ? '#ARButton' : '#VRButton'
  if (document.querySelector(selector) === null) {
    

    const d = document.createElement('div')
      d.setAttribute("style", " padding: 16px; z-index: 999; position:absolute; ") 
      d.setAttribute("class", "logo")

      const i = document.createElement('img')
      i.src = "https://psyche.asu.edu/wp-content/themes/psyche/static/img/nasa.svg"
      i.alt = "NASA"
      i.setAttribute("style", "height:57px; width:auto; ") 
      const li = document.createElement('a')
      li.setAttribute("href", "https://www.nasa.gov")
      li.appendChild(i)
      

      //<span class="divider" style="left:auto;"></span>
      const s = document.createElement('span')
      s.setAttribute("class", "divider logo")
      s.setAttribute("style", "left:auto; width:1px; height: 57px; display:inline-block;  white-space: nowrap; font-family: monospace; margin: 0 14px; background: white;")

      const i2 = document.createElement('img')
      i2.src="https://psyche.asu.edu/wp-content/themes/psyche/static/img/psyche.svg"
      i2.alt = "Psyche"
      i2.setAttribute("style", "height:57px; width: auto; ") 
      const li2 = document.createElement('a')
      li2.setAttribute("href", "https://psyche.asu.edu")
      li2.appendChild(i2)

      const h = document.createElement('h1')
      h.textContent = "Psyche Spacecraft"
      h.setAttribute("style", "font-family: 'TradeGothic', 'Roboto', sans-serif; font-weight: bold; line-height:1.4; color:#a53f5b; font-size:xx-large; ")

      const p = document.createElement('p')
      p.textContent = "An interactive experience tracking Psyche spacecraft. \r\n Wait till 3D models are loaded and moving on screen"
      p.setAttribute("style", "color:white; font-family: 'Helvetica', 'Arial', sans-serif; font-size:19px; font-weight:400; line-height: 1.65;")

      d.appendChild(li)
      d.appendChild(s)
      d.appendChild(li2)

      const t = document.createElement('div')
      t.setAttribute("style", " padding: 16px; z-index: 999; position:absolute; ") 
      t.setAttribute("id", "mytext")
      t.appendChild(h)
      t.appendChild(p)

      
      //document.body.prepend(t)
      //document.body.prepend(d)
      const r = document.getElementById("root")
      r?.prepend(t)
      r?.prepend(d)
      

    document.body.appendChild(button.createButton(gl, sessionInit))
    document.body.appendChild(button2.createButton(gl, sessionInit))
    
  }
}

export type XRCanvasProps = ContainerProps & {
  sessionInit?: XRSessionInit
  /**
   * Enables foveated rendering,
   * 0 = no foveation = full resolution,
   * 1 = maximum foveation = the edges render at lower resolution
   */
  foveation?: number
}

export function VRCanvas({ children, sessionInit, onCreated, ...rest }: XRCanvasProps) {
  return (
    <XRCanvas
      onCreated={(state) => {
        onCreated?.(state)

        createXRButton('VR', state.gl, sessionInit)
      }}
      {...rest}
    >
      {children}
    </XRCanvas>
  )
}

export function ARCanvas({ onCreated, children, sessionInit, ...rest }: XRCanvasProps) {
  return (
    <XRCanvas
      onCreated={(state) => {
        onCreated?.(state)

        createXRButton('AR', state.gl, sessionInit)
      }}
      {...rest}
    >
      {children}
    </XRCanvas>
  )
}

export const useXR = () => {
  const xrValue = React.useContext(XRContext)
  const interactionsValue = React.useContext(InteractionsContext)

  const contextValue = React.useMemo(() => ({ ...xrValue, ...interactionsValue }), [xrValue, interactionsValue])

  return contextValue
}

/**
 * @deprecated R3F v8's built-in `useFrame` extends the `XRSession.requestAnimationFrame` signature:
 *
 * `useFrame((state, delta, xrFrame) => void)`
 *
 * @see https://mdn.io/XRFrame
 */
export const useXRFrame = (callback: (time: DOMHighResTimeStamp, xrFrame: XRFrame) => void) => {
  const { gl } = useThree()
  const requestRef = React.useRef<number>()
  const previousTimeRef = React.useRef<number>()

  const loop = React.useCallback(
    (time: DOMHighResTimeStamp, xrFrame: XRFrame) => {
      if (previousTimeRef.current !== undefined) {
        callback(time, xrFrame)
      }

      previousTimeRef.current = time
      requestRef.current = gl.xr.getSession()!.requestAnimationFrame(loop)
    },
    [gl.xr, callback]
  )

  React.useEffect(() => {
    const handleSessionChange = () => {
      if (!gl.xr?.isPresenting) return

      if (requestRef.current) {
        gl.xr.getSession()!.cancelAnimationFrame(requestRef.current)
      }

      requestRef.current = gl.xr.getSession()!.requestAnimationFrame(loop)
    }
    handleSessionChange()

    gl.xr.addEventListener('sessionstart', handleSessionChange)
    gl.xr.addEventListener('sessionend', handleSessionChange)

    return () => {
      gl.xr.removeEventListener('sessionstart', handleSessionChange)
      gl.xr.removeEventListener('sessionend', handleSessionChange)

      if (requestRef.current) {
        gl.xr.getSession()!.cancelAnimationFrame(requestRef.current)
      }
    }
  }, [loop, gl.xr])
}

export const useController = (handedness: XRHandedness) => {
  const { controllers } = useXR()
  const controller = React.useMemo(() => controllers.find((it) => it.inputSource.handedness === handedness), [handedness, controllers])

  return controller
}
