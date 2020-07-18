
// Script manager

import ScriptEnv from './script_env.js'
import Utils from '../stuff/utils.js'

const DEF_LIMIT = 200

class ScriptEngine {
    constructor() {}

    init_data(dc) {
        this.dc = dc
        this.data = dc.data
    }

    register(scripts) {
        this.init_state()
        for (var s of scripts) {

            if (s.src.init) {
                s.src.init_src = this.get_raw_src(s.src.init)
            }
            if (s.src.update) {
                s.src.upd_src = this.get_raw_src(s.src.update)
            }

            this.env = new ScriptEnv(s.src, {
                open: this.open,
                high: this.high,
                low: this.low,
                close: this.close,
                vol: this.vol
            })
        }
        let t1 = Utils.now()
        this.run(s)
        console.log('Perf', Utils.now() - t1)
    }

    init_state() {
        // Inverted arrays
        this.open = []
        this.high = []
        this.low = []
        this.close = []
        this.vol = []

        this.iter = 0
        this.t = 0
        this.skip = false // skip the step
    }

    get_raw_src(f) {
        let src = f.toString()
        return src.slice(
            src.indexOf("{") + 1,
            src.lastIndexOf("}")
        )
    }

    run(script) {
        try {
            let ohlcv = this.data.chart.data
            for (var i = 0; i < ohlcv.length; i++) {
                this.iter = i
                this.t = ohlcv[i][0]
                this.step(ohlcv[i])
                this.env.output.init()
                let v = this.env.output.update()

                if (this.skip) {
                    this.skip = false
                    continue
                }

                this.copy(v)
                this.limit()
            }
        } catch(e) {
            console.log(e)
        }

        this.dc.set(`onchart.ScriptOverlay.data`, this.env.data)

    }

    step(data) {
        this.open.unshift(data[1])
        this.high.unshift(data[2])
        this.low.unshift(data[3])
        this.close.unshift(data[4])
        this.vol.unshift(data[5])
        this.env.output.unshift(undefined)
    }

    // Copy the recent value to the direct buff
    copy(v) {
        if (v !== undefined) this.env.output[0] = v
        let val = this.env.output[0]
        this.env.data.push([this.t, val])
    }

    limit() {
        this.open.length = DEF_LIMIT
        this.high.length = DEF_LIMIT
        this.low.length = DEF_LIMIT
        this.close.length = DEF_LIMIT
        this.vol.length = DEF_LIMIT
        this.env.output.length = DEF_LIMIT
    }
}

export default new ScriptEngine()
