const button = document.getElementById("cooldownBtn")
const progress = document.querySelector(".progress")

const radius = 54
const circumference = 2 * Math.PI * radius

progress.style.strokeDasharray = circumference
progress.style.strokeDashoffset = circumference

let cooldown = 5 // seconds

button.onclick = () => {

    button.disabled = true

    let start = Date.now()

    const interval = setInterval(() => {

        let elapsed = (Date.now() - start) / 1000
        let percent = elapsed / cooldown

        let offset = circumference * percent
        progress.style.strokeDashoffset = circumference - offset

        if (elapsed >= cooldown) {

            clearInterval(interval)

            progress.style.strokeDashoffset = circumference
            button.disabled = false
        }

    }, 16)
}