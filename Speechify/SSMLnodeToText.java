import com.google.cloud.texttospeech.v1.AudioConfig;
import com.google.cloud.texttospeech.v1.AudioEncoding;
import com.google.cloud.texttospeech.v1.SsmlVoiceGender;
import com.google.cloud.texttospeech.v1.SynthesisInput;
import com.google.cloud.texttospeech.v1.SynthesizeSpeechResponse;
import com.google.cloud.texttospeech.v1.TextToSpeechClient;
import com.google.cloud.texttospeech.v1.VoiceSelectionParams;
import com.google.common.html.HtmlEscapers;
import com.google.protobuf.ByteString;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Paths;

public class SSMLnodeToText {

	public static void ssmlToAudio(String ssmlText, String outFile) throws Exception {

	  try (TextToSpeechClient textToSpeechClient = TextToSpeechClient.create()) {

	    SynthesisInput input = SynthesisInput.newBuilder().setSsml(ssmlText).build();

	    VoiceSelectionParams voice =
		VoiceSelectionParams.newBuilder()
		    .setLanguageCode("en-US")
		    .setSsmlGender(SsmlVoiceGender.MALE)
		    .build();

	    AudioConfig audioConfig =
		AudioConfig.newBuilder().setAudioEncoding(AudioEncoding.MP3).build();

	    SynthesizeSpeechResponse response =
		textToSpeechClient.synthesizeSpeech(input, voice, audioConfig);

	    ByteString audioContents = response.getAudioContent();

	    try (OutputStream out = new FileOutputStream(outFile)) {
	      out.write(audioContents.toByteArray());
	      System.out.println("Audio content written to file " + outFile);
	    }
	  }
	}
};
