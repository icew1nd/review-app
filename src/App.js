import React from "react";
import "./App.css";
import one from "./assets/1.png";
import two from "./assets/2.png";
import three from "./assets/3.png";
import four from "./assets/4.png";
import five from "./assets/5.png";
import spinner from "./assets/spinner.svg";

import config from "./config.json";
import DonutChart from "react-d3-donut";
import WordCloud from "react-d3-cloud";

class TimerBar extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      startTime: 0,
      intervalId: null,
      percent: 0
    };
  }
  componentDidMount() {
    this.setState({ startTime: new Date().getTime() });
    const intervalId = setInterval(this.calculatePercent, 5);
    this.setState({ intervalId });
  }
  componentWillUnmount() {
    clearInterval(this.state.intervalId);
  }
  calculatePercent = () => {
    if (this.state.startTime) {
      const interval = this.props.interval * 1000;
      const currentTime = new Date().getTime();
      const timeDiff = currentTime - this.state.startTime;
      const absoluteTimediff = timeDiff % interval;
      const percent = (absoluteTimediff / interval) * 100;
      this.setState({ percent });
    }
  };
  render() {
    return (
      <div
        style={{
          backgroundColor: "#5c6067",
          width: this.state.percent + "%",
          height: "5px"
        }}
      />
    );
  }
}

class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      intervalId: null,
      firstLoad: true,
      loading: true,
      entries: []
    };
  }

  componentDidMount() {
    this.fetchReviews();
    const intervalId = setInterval(this.fetchReviews, config.cacheTimer * 1000);
    this.setState({ intervalId });
  }
  componentWillUnmount() {
    clearInterval(this.state.intervalId);
  }

  fetchReviews = () => {
    this.setState({ loading: true });
    fetch(
      "https://itunes.apple.com/" +
        config.appLocale +
        "/rss/customerreviews/id=" +
        config.appId +
        "/sortBy=mostRecent/json"
    )
      .then(response => response.json())
      .then(data => {
        const fullEntries = data.feed.entry;
        let entries;
        if (config.happyMode) {
          entries = fullEntries.filter(entry => {
            if (entry["im:rating"].label > 2) return entry;
          });
        } else {
          entries = fullEntries;
        }
        const wordCloud = this.calculateWordCloud(fullEntries);
        const donutData = this.calculateDonutData(fullEntries);
        const ratingAverage = this.calculateAverage(donutData);

        return this.setState({
          firstLoad: false,
          loading: false,
          entries: entries,
          donutData,
          ratingAverage,
          wordCloud
        });
      });
  };

  calculateAverage(donutData) {
    let totalRatings = 0;
    let totalValue = 0;
    donutData.forEach(data => {
      totalRatings += data.count;
      totalValue += parseInt(data.name) * data.count;
    });

    return totalValue / totalRatings;
  }

  calculateWordCloud(entries) {
    let calculated = [];
    entries.forEach(entry => {
      let comment = entry.content.label + "";
      comment = comment.replace(/[^a-zA-Z ]/g, "");
      let wordArr = comment.match(/\S+/g);
      if (wordArr) {
        wordArr = wordArr.filter(word => {
          if (word.length > 3) return word;
        });
        wordArr.forEach(word => {
          if (!calculated[word]) {
            calculated[word] = { text: word, value: 5 };
          } else {
            calculated[word].value *= 2;
          }
        });
      }
    });

    calculated = Object.values(calculated);
    calculated.sort((a, b) => {
      if (a.value > b.value) {
        return -1;
      } else if (a.value < b.value) {
        return 1;
      } else {
        return 0;
      }
    });

    return calculated.slice(0, 200);
  }

  calculateDonutData(entries) {
    const arr = [];
    entries.forEach(entry => {
      const rating = entry["im:rating"].label;
      if (!arr[rating]) {
        arr[rating] = {
          name: rating,
          count: 1,
          color: config.backgrounds[parseInt(rating) - 1]
        };
      } else {
        arr[rating].count++;
      }
    });
    arr.shift();

    return arr;
  }

  render() {
    return (
      <div className="App">
        <header className="App-header">
          {this.state.loading && this.state.firstLoad ? (
            <img src={spinner} alt="" />
          ) : (
            <div>
              {this.state.loading && (
                <img src={spinner} alt="" height="50" className="spinner-alt" />
              )}
              <ReviewCarousel
                entries={this.state.entries}
                wordCloud={this.state.wordCloud}
                ratingAverage={this.state.ratingAverage}
                donutData={this.state.donutData}
              />
            </div>
          )}
        </header>
      </div>
    );
  }
}

class ReviewCarousel extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      mode: "review",
      statsId: 0,
      intervalId: 0,
      currentEntry: 0
    };
  }

  componentDidMount() {
    const intervalId = setInterval(
      this.changeEntry,
      config.transitionSpeed * 1000
    );
    this.setState({ intervalId });
  }

  componentWillUnmount() {
    clearInterval(this.state.intervalId);
  }

  changeEntry = () => {
    this.setState({ changingEntry: true });
    setTimeout(() => {
      if (
        (this.state.currentEntry + 1) % 5 === 0 &&
        this.state.mode === "review"
      ) {
        const statsId = this.state.statsId + 1;
        this.setState({ statsId, mode: "stats" });
      } else {
        const newEntry = this.state.currentEntry + 1;

        this.setState({
          currentEntry: newEntry,
          mode: "review"
        });
      }
    }, 300);
    setTimeout(() => {
      this.setState({
        changingEntry: false
      });
    }, 500);
  };

  render() {
    const entry = this.props.entries[
      (this.state.currentEntry + 1) % this.props.entries.length
    ];
    const content = entry.content.label;
    const author = entry.author.name.label;
    const rating = entry["im:rating"].label;

    const fontSizeMapper = word => Math.log2(word.value) * 5;
    const rotate = word =>
      (word.value * (Math.floor(Math.random() * (15 - 5 + 1)) + 5)) % 360;

    return (
      <div>
        {this.state.changingEntry && (
          <div className={this.state.changingEntry ? "fade-in" : "fade-out"} />
        )}
        <div className="timerBarContainer">
          <TimerBar interval={config.transitionSpeed} />
        </div>
        {this.state.mode === "review" ? (
          <div className="entryContainer">
            <div className="stars">{this.renderStars(rating)} </div>
            <div className="content">{content}</div>
            <div className="author">- {author}</div>{" "}
            {this.renderRatingImage(rating)}
          </div>
        ) : this.state.statsId % 2 !== 0 ? (
          <div style={{ width: 1800, height: 1000 }}>
            <WordCloud
              height={900}
              width={1600}
              font="Helvetica"
              data={this.props.wordCloud}
              fontSizeMapper={fontSizeMapper}
              rotate={rotate}
            />
            <div className="ratingBox__inner__asterix">
              Top 100 words in the last 50 ratings
            </div>
          </div>
        ) : (
          <div>
            <DonutChart
              innerRadius={250}
              outerRadius={300}
              transition={true}
              svgClass="example6"
              pieClass="pie6"
              displayTooltip={true}
              strokeWidth={3}
              data={this.props.donutData}
            />
            <div className="donutLegend">
              {this.renderLegend(this.props.donutData)}
            </div>

            <div className="ratingBox">
              <div className="ratingBox__inner">
                <div className="stars">
                  {this.renderStars(Math.round(this.props.ratingAverage))}{" "}
                </div>
                <div className="ratingBox__inner__rating">
                  {this.props.ratingAverage}/5
                </div>
                <div className="ratingBox__inner__asterix">
                  Based on the last 50 ratings
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  renderLegend(donutData) {
    const legendArr = [];
    donutData.forEach(data => {
      legendArr.push(
        <span>
          <div
            style={{
              display: "inline-block",
              backgroundColor: data.color,
              width: 16,
              height: 16
            }}
          />
          <span
            style={{
              fontSize: "20px",
              marginLeft: "0.2em",
              marginRight: "1em"
            }}
          >
            {data.name}
          </span>
        </span>
      );
    });
    return legendArr;
  }
  renderRatingImage(rating) {
    switch (rating + "") {
      case "1":
        return <img src={one} alt="" className="ratingImage" />;
      case "2":
        return <img src={two} alt="" className="ratingImage" />;
      case "3":
        return <img src={three} alt="" className="ratingImage" />;
      case "4":
        return <img src={four} alt="" className="ratingImage" />;
      case "5":
        return <img src={five} alt="" className="ratingImage" />;
      default:
        return <img src={three} alt="" className="ratingImage" />;
    }
  }

  renderStars(rating) {
    const starArray = [];
    for (let i = 0; i < rating; i++) {
      starArray.push("🌟 ");
    }
    return starArray;
  }
}

export default App;
