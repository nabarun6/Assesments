class ParseSSML {
        constructor(ssml) {
          console.log(this);
          this.ssml = ssml;
          this.queue = [];
          this.nodes = new Map(
            Object.entries({
              break: this._break,
              prosody: this.prosody,
              '#text': this.text,
              voice: this.voice,
              p: this.p,
              s: this.s,
              'say-as': this.sayAs,
            })
          );
          this.pitches = new Map(
            Object.entries({
              'x-low': 0.3333333333333333,
              low: 0.6666666666666666,
              default: 1,
              medium: 1.3333333333333333,
              high: 1.6666666666666665,
              'x-high': 1.9999999999999998,
            })
          );
          this.rates = new Map(
            Object.entries({
              'x-slow': 0.1,
              slow: 0.5,
              default: 1,
              medium: 2.5,
              fast: 5,
              'x-fast': 10,
            })
          );
          this.strengths = new Map(
            Object.entries({
              none: 0,
              'x-weak': 0.125,
              weak: 0.25,
              medium: 0.5,
              strong: 1,
              'x-strong': 2,
            })
          );
          this.dates = new Map(
            Object.entries({
              m: 'month',
              d: 'day',
              y: 'year',
            })
          );
          this.ampm = new Map(
            Object.entries({
              a: 'AM',
              p: 'PM',
            })
          );
          this.lang = navigator.language;
          this.matchSayAsDateFormat = /\d+(?=[.\-/]|$)/g;
          this.notSayAsDateFormat = /[^\d.\-/]+/g;
          this.matchSayAsTimeDigits = /\d+/g;
          this.matchSayAsTimeAP = /[ap]/i;
          this.toOrdinal = n =>
            (n += [, 'st', 'nd', 'rd'][(n % 100 >> 3) ^ 1 && n % 10] || 'th');

          if (this.ssml && typeof this.ssml === 'string') {
            this.ssml = new DOMParser().parseFromString(
              ssml,
              'application/xml'
            );
          }
          if (
            this.ssml instanceof Document &&
            this.ssml.documentElement.nodeName === 'speak'
          ) {
            this.br();
            this.sub();
            if (
              this.ssml.documentElement.attributes.getNamedItem('xml:lang')
                .value.length
            ) {
              this.lang = this.ssml.documentElement.attributes.getNamedItem(
                'xml:lang'
              ).value;
            } else {
              this.lang = navigator.language;
            }
            if (this.ssml.documentElement.children.length === 0) {
              const utterance = new SpeechSynthesisUtterance(
                this.ssml.documentElement.textContent
              );
              utterance.lang = this.lang;
              this._queue({
                utterance,
              });
            } else {
              for (let node of this.ssml.documentElement.childNodes) {
                console.log(node.nodeName);
                Reflect.apply(this.nodes.get(node.nodeName), this, [
                  {
                    node,
                  },
                ]);
              }
            }
          } else {
          const utterance = new SpeechSynthesisUtterance((this.ssml = ssml));
            utterance.lang = this.lang;
            this._queue({
              utterance,
            });
          }
        }
        prosody({ node, voice }) {
          console.log('prosody', node);
          const utterance = new SpeechSynthesisUtterance();
          utterance.lang = this.lang;
          const [
            {
              pitch = this.pitches.get('default'),
              rate = this.rates.get('default'),
            },
            text,
          ] = [
            [...node.attributes].reduce(
              (o, { nodeName, nodeValue }) =>
                Object.assign(o, {
                  [nodeName]:
                    this.pitches.get(nodeValue) ||
                    this.rates.get(nodeValue) ||
                    nodeValue,
                }),
              Object.create(null)
            ),
            node.textContent,
          ];
          console.log(pitch, rate);
          Object.assign(utterance, {
            pitch: pitch < 0 || pitch > 2 ? this.pitches.get('default') : pitch,
            rate: rate < 0.1 || rate > 10 ? this.rates.get('default') : rate,
            text,
            voice,
          });
          this._queue({
            utterance,
          });
        }
        voice({ node }) {
          const [{ name }, text] = [
            [...node.attributes].reduce(
              (o, { nodeName, nodeValue }) =>
                Object.assign(o, {
                  [nodeName]: nodeValue,
                }),
              Object.create(null)
            ),
            node.textContent,
          ];
          const voice = SSMLParser.voices.find(
            ({ name: voiceName, lang }) =>
              voiceName === name || voiceName.includes(name)
          );
          console.log(name, voice);
          if (node.children.length === 0) {
            const utterance = new SpeechSynthesisUtterance();
            if (node.getAttribute('languages')) {
              utterance.lang = node.getAttribute('languages');
            }
            Object.assign(utterance, {
              voice,
              text,
            });
            this._queue({
              utterance,
            });
            } else {
            for (let childNode of node.childNodes) {
              Reflect.apply(this.nodes.get(childNode.nodeName), this, [
                {
                  node: childNode,
                  voice,
                },
              ]);
            }
          }
        }
        _break({ node, _strength }) {
          let strength = !node
            ? _strength
            : node.getAttribute('strength')
            ? this.strengths.get(node.getAttribute('strength'))
            : node.getAttribute('time')
            ? this.strengths.get('none')
            : this.strengths.get('medium');
          let time =
          node && node.getAttribute('time')
              ? node
                  .getAttribute('time')
                  .match(/[\d.]+|\w+$/g)
                  .reduce(
                    (n, t /* "ms" or "s" */) =>
                      Number(n) * (t === 's' ? 1 : 0.001)
                  )
              : this.strengths.get('none');
          console.log(strength, time);
          if (!strength && !time) {
            strength = this.strengths.get('medium');
          }
          time += strength;
          console.log(time);
          this.queue.push(
            () =>
              new Promise(resolve => {
                const context = new AudioContext();
                const ab = context.createBuffer(1, 44100 * time, 44100);
                const source = context.createBufferSource();
                source.buffer = ab;
                source.connect(context.destination);
                source.onended = e => {
                  source.onended = null;
                  context.close().then(resolve);
                };
                source.start(context.currentTime);
                source.stop(context.currentTime + time);
              })
          );
        }
        _queue({ utterance }) {
          if (utterance && utterance instanceof SpeechSynthesisUtterance) {
            this.queue.push(
              () =>
                new Promise(resolve => {
                  if (utterance.voice === null) {
                    utterance.voice =
                      SSMLParser.voices.find(({ name }) =>
                        new RegExp('^English[\\s_]\\(America\\)(\s|$)').test(name)
                      ) ||
                      SSMLParser.voices.find(({ lang }) =>
                        new RegExp(`^${navigator.language}`, 'i').test(lang)
                      ) ||
                      SSMLParser.voices.find(({ name }) =>
                        new RegExp(
                          `^${navigator.languages.join('|^')}`,
                          'i'
                        ).test(name)
                      );
                  }
                  console.log(utterance.voice.name);
                  utterance.onend = resolve;
                  window.speechSynthesis.speak(utterance);
                })
                );
          }
        }
        text({ node, voice }) {
          const utterance = new SpeechSynthesisUtterance(node.nodeValue);
          if (voice) {
            utterance.voice = voice;
          }
          if (utterance.text.trim()) {
            this._queue({
              utterance,
            });
          }
        }
        sub() {
          const utterance = new SpeechSynthesisUtterance();
          this.ssml.querySelectorAll('sub').forEach(sub => {
            const textNode = this.ssml.createTextNode(
              sub.getAttribute('alias')
            );
            sub.parentNode.replaceChild(textNode, sub);
          });
        }
        br() {
        this.ssml.querySelectorAll('break').forEach(br => {
            if (br.getAttribute('strength') === 'none') {
              if (
                br.nextSibling &&
                br.nextSibling.nodeName === '#text' &&
                br.previousSibling &&
                br.previousSibling.nodeName === '#text'
              ) {
                br.previousSibling.nodeValue += br.nextSibling.nodeValue;
                br.parentNode.removeChild(br.nextSibling);
                br.parentNode.removeChild(br);
              } else {
                br.parentNode.removeChild(br);
              }
            }
          });
        }
        p({ node, voice }) {
          if (node.children.length === 0) {
            console.log(node.textContent);
            const utterance = new SpeechSynthesisUtterance(node.textContent);
            if (voice) {
              utterance.voice = voice;
            }
            this._queue({
              utterance,
            });
            } else {
            for (let childNode of node.childNodes) {
              Reflect.apply(this.nodes.get(childNode.nodeName), this, [
                {
                  node: childNode,
                  voice,
                },
              ]);
            }
          }
        }
        s({ node, voice }) {
          if (node.children.length === 0) {
            console.log(node.textContent);
            const utterance = new SpeechSynthesisUtterance(node.textContent);
            if (voice) {
              utterance.voice = voice;
            }
            this._queue({
              utterance,
            });
          } else {
            for (let childNode of node.childNodes) {
              Reflect.apply(this.nodes.get(childNode.nodeName), this, [
                {
                  node: childNode,
                  voice,
                },
              ]);
            }
            }
        }
        // https://www.w3.org/TR/2005/NOTE-ssml-sayas-20050526
        sayAs({ node, voice }) {
          const interpretAs = node.getAttribute('interpret-as');
          if (interpretAs === 'characters' || interpretAs === 'digits') {
            for (let char of node.textContent) {
              const utterance = new SpeechSynthesisUtterance(char);
              this._queue({
                utterance,
              });
            }
          }
          if (interpretAs === 'cardinal') {
            const utterance = new SpeechSynthesisUtterance(node.textContent);
            this._queue({
              utterance,
            });
          }
          if (interpretAs === 'ordinal') {
            const utterance = new SpeechSynthesisUtterance(
              this.toOrdinal(node.textContent)
            );
            this._queue({
              utterance,
            });
          }
          if (interpretAs === 'date') {
            const utterance = new SpeechSynthesisUtterance();
            node.textContent = node.textContent.replace(
              this.notSayAsDateFormat,
              ''
            );

            if (node.getAttribute('format')) {
              const format = [...node.getAttribute('format')];

              let {
                month = '1',
                day = '1',
                year = new Date().getFullYear(),
                } = format.reduce(
                (o, key, index) => ({
                  [this.dates.get(key)]: node.textContent.match(
                    this.matchSayAsDateFormat
                  )[index],
                  ...o,
                }),
                {}
              );

              if (year.length === 2) {
                year =
                  new Date()
                    .getFullYear()
                    .toString()
                    .slice(0, 2) + year;
              }

              const date = new Map(
                new Intl.DateTimeFormat(this.lang, {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  })
                  .formatToParts(new Date(`${month},${day},${year}`))
                  .map(({ type, value }) => [type, value])
              );

              const text =
                `${format.includes('m') ? date.get('month') : ''} ` +
                `${
                  format.includes('d')
                    ? this.toOrdinal(date.get('day')).concat(
                        format.includes('y') ? date.get('literal') : ''
                      )
                    : ''
                }` +
                `${format.includes('y') ? date.get('year') : ''}`;

              console.log(month, day, year, date, text);

              utterance.text = text;
              this._queue({
                utterance,
              });
              } else {
              utterance.text = node.textContent;
              this._queue({
                utterance,
              });
            }
          }
          if (interpretAs === 'time') {
            if (node.getAttribute('format')) {
              const format = node.getAttribute('format');

              let t = node.textContent.match(this.matchSayAsTimeDigits);

              const ampm = node.textContent.match(this.matchSayAsTimeAP);

              let text = '';

              if (t[0].length === 3) {
                t = [t[0].slice(0, 1), t[0].slice(1)];
              }
              if (t[0].length === 4) {
                t = [t[0].slice(0, 2), t[0].slice(2)];
              }

              console.log(t);

              const date = new Date(...[1970, 0, 1].concat(...t).map(Number));

              console.log(date);

              const time = new Map(
                new Intl.DateTimeFormat(this.lang, {
                  hour: 'numeric',
                  minute: 'numeric',
                  second: 'numeric',
                  timeZoneName: 'long',
                  hourCycle: 'h24',
                })
                  .formatToParts(date)
                  .map(({ type, value }) => [type, value])
                  .concat([['millisecond', date.getMilliseconds()]])
              );
              if (ampm && ampm.length) {
                time.set('dayperiod', this.ampm.get(ampm.pop().toLowerCase()));
              }

              text += `${Number(time.get('hour'))}`;

              if (Number(time.get('minute'))) {
                if (Number(time.get('minute')) < 10) {
                  text += ` O ${Number(time.get('minute'))}`;
                } else {
                  text += `:${time.get('minute')}`;
                }
              }

              if (Number(time.get('second'))) {
                text += ` and ${Number(time.get('second'))}${
                  Number(time.get('millisecond'))
                    ? '.' + time.get('millisecond') + ' '
                    : ' '
                }second${Number(time.get('second')) ? 's' : ''}`;
              }
              if (format === 'hms24') {
                text += ` ${time.get('dayperiod')} ${time.get('timeZoneName')}`;
              }

              if (format === 'hms12') {
                if (!this.matchSayAsTimeAP.test(text) && !ampm) {
                  text += " o'clock";
                } else {
                  if (ampm) {
                    text += ` ${time.get('dayperiod')}`;
                  }
                }
              }

              console.log(ampm, time);

              const utterance = new SpeechSynthesisUtterance(text);
              this._queue({
                utterance,
              });
              } else {
              const utterance = new SpeechSynthesisUtterance(node.textContent);
              this._queue({
                utterance,
              });
            }
          }
        }
      }
              
