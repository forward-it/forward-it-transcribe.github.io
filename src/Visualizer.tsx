import * as React from 'react'
import {useVisualizer, models} from 'react-audio-viz'
const Visualizer = () => {
    const audioRef = React.useRef(null)
    const [AudioViz, init] = useVisualizer(audioRef)

    return (
        <div >
            <audio ref={audioRef} onPlay={init} src={"https://drive.google.com/file/d/13yAPJHPp0mVXY4tNi3HxS29LWA1LKSWo/view?usp=sharing"} />
            <AudioViz
                model={models.polar({
                    darkMode: true,
                    reversed: false,
                    scale: 2,
                    binSize: 50,
                    color: '#f44e3b'
                })}
            />
        </div>
    )
}

export default Visualizer